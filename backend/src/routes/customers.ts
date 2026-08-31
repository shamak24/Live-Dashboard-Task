import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate, requireRoles, type AuthRequest } from "../middleware/auth.js";
import { createError } from "../middleware/errorHandler.js";
import { recordActivityLog } from "../services/activityLogService.js";
import { bookingInclude } from "../services/bookingService.js";

const router = Router();

const vehicleSchema = z.object({
  make: z.string().trim().min(1).max(60),
  model: z.string().trim().min(1).max(60),
  year: z.coerce.number().int().min(1980).max(new Date().getFullYear() + 1),
  plate: z.string().trim().min(1).max(20),
});

const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  phone: z.string().trim().max(30).nullable().optional(),
  address: z.string().trim().max(500).nullable().optional(),
});

async function getCustomerForUser(userId: string) {
  const customer = await prisma.customer.findUnique({
    where: { userId },
    include: {
      user: { select: { id: true, name: true, email: true } },
      vehicles: {
        orderBy: [{ year: "desc" }, { make: "asc" }],
      },
    },
  });
  if (!customer) throw createError("Customer profile not found", 404);
  return customer;
}

function formatCustomerProfile(
  customer: Awaited<ReturnType<typeof getCustomerForUser>>
) {
  return {
    id: customer.id,
    name: customer.user.name,
    email: customer.user.email,
    phone: customer.phone,
    address: customer.address,
    vehicles: customer.vehicles,
  };
}

router.get(
  "/me",
  authenticate,
  requireRoles("CUSTOMER"),
  async (req: AuthRequest, res, next) => {
    try {
      const customer = await getCustomerForUser(req.user!.userId);
      res.json(formatCustomerProfile(customer));
    } catch (err) {
      next(err);
    }
  }
);

router.patch(
  "/me",
  authenticate,
  requireRoles("CUSTOMER"),
  async (req: AuthRequest, res, next) => {
    try {
      const data = updateProfileSchema.parse(req.body);
      const customer = await getCustomerForUser(req.user!.userId);

      if (data.name !== undefined) {
        await prisma.user.update({
          where: { id: customer.user.id },
          data: { name: data.name },
        });
      }

      if (data.phone !== undefined || data.address !== undefined) {
        await prisma.customer.update({
          where: { id: customer.id },
          data: {
            ...(data.phone !== undefined && { phone: data.phone }),
            ...(data.address !== undefined && { address: data.address }),
          },
        });
      }

      const updated = await getCustomerForUser(req.user!.userId);
      res.json(formatCustomerProfile(updated));
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  "/me/vehicles",
  authenticate,
  requireRoles("CUSTOMER"),
  async (req: AuthRequest, res, next) => {
    try {
      const data = vehicleSchema.parse(req.body);

      const customer = await prisma.customer.findUnique({
        where: { userId: req.user!.userId },
      });
      if (!customer) throw createError("Customer profile not found", 404);

      const vehicle = await prisma.vehicle.create({
        data: {
          customerId: customer.id,
          make: data.make,
          model: data.model,
          year: data.year,
          plate: data.plate.toUpperCase(),
        },
      });

      recordActivityLog(
        `Vehicle added for ${req.user!.email}: ${data.year} ${data.make} ${data.model}`
      );

      res.status(201).json(vehicle);
    } catch (err) {
      next(err);
    }
  }
);

router.delete(
  "/me/vehicles/:vehicleId",
  authenticate,
  requireRoles("CUSTOMER"),
  async (req: AuthRequest, res, next) => {
    try {
      const vehicleId = String(req.params.vehicleId);
      const customer = await prisma.customer.findUnique({
        where: { userId: req.user!.userId },
      });
      if (!customer) throw createError("Customer profile not found", 404);

      const vehicle = await prisma.vehicle.findFirst({
        where: { id: vehicleId, customerId: customer.id },
      });
      if (!vehicle) throw createError("Vehicle not found", 404);

      const bookingCount = await prisma.booking.count({
        where: { vehicleId },
      });
      if (bookingCount > 0) {
        throw createError(
          "This vehicle has booking history and cannot be removed",
          400
        );
      }

      await prisma.vehicle.delete({ where: { id: vehicleId } });

      recordActivityLog(
        `Vehicle removed for ${req.user!.email}: ${vehicle.year} ${vehicle.make} ${vehicle.model}`
      );

      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @openapi
 * /api/customers:
 *   get:
 *     summary: List customers with booking stats
 *     tags: [Customers]
 */
router.get(
  "/",
  authenticate,
  requireRoles("ADMIN"),
  async (_req, res, next) => {
    try {
      const customers = await prisma.customer.findMany({
        include: {
          user: { select: { id: true, name: true, email: true, createdAt: true } },
          vehicles: { select: { id: true, make: true, model: true, plate: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      const result = await Promise.all(
        customers.map(async (c) => {
          const bookingCount = await prisma.booking.count({
            where: { customerId: c.id },
          });
          const totalSpent = await prisma.booking.aggregate({
            where: { customerId: c.id, status: "COMPLETED" },
            _sum: { amount: true },
          });

          return {
            id: c.id,
            name: c.user.name,
            email: c.user.email,
            phone: c.phone,
            address: c.address,
            createdAt: c.user.createdAt,
            vehicleCount: c.vehicles.length,
            vehicles: c.vehicles,
            bookingCount,
            totalSpent: Number(totalSpent._sum.amount ?? 0),
          };
        })
      );

      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  "/:id",
  authenticate,
  requireRoles("ADMIN"),
  async (req, res, next) => {
    try {
      const customerId = String(req.params.id);

      const customer = await prisma.customer.findUnique({
        where: { id: customerId },
        include: {
          user: { select: { id: true, name: true, email: true, createdAt: true } },
          vehicles: {
            orderBy: [{ year: "desc" }, { make: "asc" }],
          },
          bookings: {
            include: bookingInclude,
            orderBy: { scheduledAt: "desc" },
            take: 50,
          },
        },
      });

      if (!customer) throw createError("Customer not found", 404);

      const [bookingCount, totalSpentResult] = await Promise.all([
        prisma.booking.count({ where: { customerId: customer.id } }),
        prisma.booking.aggregate({
          where: { customerId: customer.id, status: "COMPLETED" },
          _sum: { amount: true },
        }),
      ]);

      res.json({
        id: customer.id,
        name: customer.user.name,
        email: customer.user.email,
        phone: customer.phone,
        address: customer.address,
        createdAt: customer.user.createdAt,
        vehicleCount: customer.vehicles.length,
        bookingCount,
        totalSpent: Number(totalSpentResult._sum.amount ?? 0),
        vehicles: customer.vehicles,
        bookings: customer.bookings.map((b) => ({
          ...b,
          amount: Number(b.amount),
        })),
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
