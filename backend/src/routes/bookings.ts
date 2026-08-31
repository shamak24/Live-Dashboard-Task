import { Router } from "express";
import { BookingStatus, Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate, requireRoles, type AuthRequest } from "../middleware/auth.js";
import {
  bookingInclude,
  createBooking,
  getBookingById,
  retryBookingSummary,
  updateBookingStatus,
} from "../services/bookingService.js";
import { createError } from "../middleware/errorHandler.js";

const router = Router();

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(2000).default(20),
  status: z.nativeEnum(BookingStatus).optional(),
  mechanicId: z.string().optional(),
  serviceCategoryId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  search: z.string().optional(),
  sortBy: z
    .enum(["createdAt", "scheduledAt", "amount", "status"])
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

const statusUpdateSchema = z.object({
  status: z.nativeEnum(BookingStatus),
  mechanicId: z.string().optional(),
  version: z.number().int().optional(),
});

const createBookingSchema = z.object({
  vehicleId: z.string().min(1),
  serviceCategoryId: z.string().min(1),
  scheduledAt: z.coerce.date(),
});

/**
 * @openapi
 * /api/bookings:
 *   get:
 *     summary: List bookings with pagination and filters
 *     tags: [Bookings]
 */
router.get(
  "/",
  authenticate,
  requireRoles("ADMIN", "MECHANIC", "CUSTOMER"),
  async (req: AuthRequest, res, next) => {
    try {
      const query = listQuerySchema.parse(req.query);
      const { page, limit, status, mechanicId, serviceCategoryId, startDate, endDate, search, sortBy, sortOrder } = query;

      const where: Prisma.BookingWhereInput = {};

      if (req.user!.role === "CUSTOMER") {
        const customer = await prisma.customer.findUnique({
          where: { userId: req.user!.userId },
        });
        if (!customer) throw createError("Customer profile not found", 404);
        where.customerId = customer.id;
      } else if (req.user!.role === "MECHANIC") {
        const mechanic = await prisma.mechanic.findUnique({
          where: { userId: req.user!.userId },
        });
        if (!mechanic) throw createError("Mechanic profile not found", 404);
        where.mechanicId = mechanic.id;
      }

      if (status) where.status = status;
      if (mechanicId && req.user!.role === "ADMIN") where.mechanicId = mechanicId;
      if (serviceCategoryId) where.serviceCategoryId = serviceCategoryId;

      if (startDate || endDate) {
        where.scheduledAt = {};
        if (startDate) where.scheduledAt.gte = new Date(startDate);
        if (endDate) where.scheduledAt.lte = new Date(endDate);
      }

      if (search) {
        where.OR = [
          { id: { contains: search, mode: "insensitive" } },
          {
            customer: {
              user: { name: { contains: search, mode: "insensitive" } },
            },
          },
        ];
      }

      const [bookings, total] = await Promise.all([
        prisma.booking.findMany({
          where,
          include: bookingInclude,
          orderBy: { [sortBy]: sortOrder },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.booking.count({ where }),
      ]);

      res.json({
        data: bookings.map((b) => ({
          ...b,
          amount: Number(b.amount),
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @openapi
 * /api/bookings:
 *   post:
 *     summary: Create a new booking (customer)
 *     tags: [Bookings]
 */
router.post(
  "/",
  authenticate,
  requireRoles("CUSTOMER"),
  async (req: AuthRequest, res, next) => {
    try {
      const body = createBookingSchema.parse(req.body);

      const customer = await prisma.customer.findUnique({
        where: { userId: req.user!.userId },
      });
      if (!customer) throw createError("Customer profile not found", 404);

      const booking = await createBooking({
        customerId: customer.id,
        vehicleId: body.vehicleId,
        serviceCategoryId: body.serviceCategoryId,
        scheduledAt: body.scheduledAt,
      });

      const payload = { ...booking, amount: Number(booking.amount) };

      const io = req.app.get("io");
      if (io) {
        io.emit("booking:updated", payload);
      }

      res.status(201).json(payload);
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  "/:id",
  authenticate,
  requireRoles("ADMIN", "MECHANIC", "CUSTOMER"),
  async (req: AuthRequest, res, next) => {
    try {
      const booking = await getBookingById(String(req.params.id));
      if (!booking) throw createError("Booking not found", 404);

      // RBAC check
      if (req.user!.role === "CUSTOMER") {
        const customer = await prisma.customer.findUnique({
          where: { userId: req.user!.userId },
        });
        if (customer?.id !== booking.customerId) {
          throw createError("Access denied", 403);
        }
      }
      if (req.user!.role === "MECHANIC") {
        const mechanic = await prisma.mechanic.findUnique({
          where: { userId: req.user!.userId },
        });
        if (mechanic?.id !== booking.mechanicId) {
          throw createError("Access denied", 403);
        }
      }

      res.json({
        ...booking,
        amount: Number(booking.amount),
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @openapi
 * /api/bookings/{id}/status:
 *   patch:
 *     summary: Update booking status (broadcasts via WebSocket)
 *     tags: [Bookings]
 */
router.patch(
  "/:id/status",
  authenticate,
  requireRoles("ADMIN", "MECHANIC"),
  async (req: AuthRequest, res, next) => {
    try {
      const bookingId = String(req.params.id);
      const { status, mechanicId, version } = statusUpdateSchema.parse(req.body);

      if (req.user!.role === "MECHANIC") {
        const mechanic = await prisma.mechanic.findUnique({
          where: { userId: req.user!.userId },
        });
        const booking = await getBookingById(bookingId);
        if (!booking || booking.mechanicId !== mechanic?.id) {
          throw createError("Access denied", 403);
        }
      }

      const updated = await updateBookingStatus(
        bookingId,
        status,
        mechanicId,
        version
      );

      const payload = { ...updated, amount: Number(updated.amount) };

      // Broadcast via Socket.IO (attached in index.ts)
      const io = req.app.get("io");
      if (io) {
        io.emit("booking:updated", payload);
      }

      res.json(payload);
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  "/:id/retry-summary",
  authenticate,
  requireRoles("ADMIN"),
  async (req, res, next) => {
    try {
      const type = z.enum(["pre", "post"]).parse(req.body.type);
      const updated = await retryBookingSummary(String(req.params.id), type);
      res.json({ ...updated, amount: Number(updated.amount) });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
