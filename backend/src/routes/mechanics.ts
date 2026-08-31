import { Router } from "express";
import { BookingStatus, MechanicStatus, Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { authenticate, requireRoles, type AuthRequest } from "../middleware/auth.js";
import { createError } from "../middleware/errorHandler.js";

const router = Router();

const ACTIVE_STATUSES = [
  BookingStatus.ASSIGNED,
  BookingStatus.MECHANIC_ON_THE_WAY,
  BookingStatus.IN_PROGRESS,
];

/**
 * @openapi
 * /api/mechanics:
 *   get:
 *     summary: List all mechanics with status and current booking
 *     tags: [Mechanics]
 */
router.get(
  "/",
  authenticate,
  requireRoles("ADMIN", "MECHANIC"),
  async (req, res, next) => {
    try {
      const availableOnly = req.query.available === "true";

      const where: Prisma.MechanicWhereInput = availableOnly
        ? {
            status: MechanicStatus.AVAILABLE,
            bookings: {
              none: { status: { in: ACTIVE_STATUSES } },
            },
          }
        : {};

      const mechanics = await prisma.mechanic.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } },
          bookings: {
            where: { status: { in: ACTIVE_STATUSES } },
            take: 1,
            include: {
              customer: {
                include: { user: { select: { name: true } } },
              },
              serviceCategory: true,
            },
            orderBy: { scheduledAt: "desc" },
          },
        },
        orderBy: { user: { name: "asc" } },
      });

      const result = await Promise.all(
        mechanics.map(async (m) => {
          const lastBooking = await prisma.booking.findFirst({
            where: { mechanicId: m.id },
            orderBy: { scheduledAt: "desc" },
            include: {
              customer: {
                include: { user: { select: { name: true } } },
              },
              serviceCategory: true,
            },
          });

          return {
            id: m.id,
            name: m.user.name,
            email: m.user.email,
            status: m.status,
            jobsCompleted: m.jobsCompleted,
            specialty: m.specialty,
            currentBooking: m.bookings[0]
              ? {
                  ...m.bookings[0],
                  amount: Number(m.bookings[0].amount),
                }
              : null,
            lastBooking: lastBooking
              ? { ...lastBooking, amount: Number(lastBooking.amount) }
              : null,
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
  requireRoles("ADMIN", "MECHANIC"),
  async (req: AuthRequest, res, next) => {
    try {
      const mechanicId = String(req.params.id);
      const mechanic = await prisma.mechanic.findUnique({
        where: { id: mechanicId },
        include: {
          user: { select: { id: true, name: true, email: true } },
          bookings: {
            include: {
              customer: {
                include: { user: { select: { name: true, email: true } } },
              },
              vehicle: true,
              serviceCategory: true,
            },
            orderBy: { scheduledAt: "desc" },
            take: 50,
          },
        },
      });

      if (!mechanic) throw createError("Mechanic not found", 404);

      if (req.user!.role === "MECHANIC") {
        const own = await prisma.mechanic.findUnique({
          where: { userId: req.user!.userId },
        });
        if (own?.id !== mechanic.id) {
          throw createError("Access denied", 403);
        }
      }

      res.json({
        id: mechanic.id,
        name: mechanic.user.name,
        email: mechanic.user.email,
        status: mechanic.status,
        jobsCompleted: mechanic.jobsCompleted,
        specialty: mechanic.specialty,
        bookings: mechanic.bookings.map((b) => ({
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
