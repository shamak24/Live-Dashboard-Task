import { Router } from "express";
import { MechanicStatus, Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { authenticate, requireRoles, type AuthRequest } from "../middleware/auth.js";
import { createError } from "../middleware/errorHandler.js";
import {
  getEffectiveMechanicStatus,
  MECHANIC_ACTIVE_BOOKING_STATUSES,
  syncMechanicStatus,
} from "../services/mechanicService.js";

const router = Router();

const ACTIVE_STATUSES = MECHANIC_ACTIVE_BOOKING_STATUSES;

/** Mechanics that can receive a new assignment (matches assignMechanicWithLock rules). */
const ASSIGNABLE_MECHANIC_WHERE: Prisma.MechanicWhereInput = {
  status: { not: MechanicStatus.OFFLINE },
  bookings: {
    none: { status: { in: ACTIVE_STATUSES } },
  },
};

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
        ? ASSIGNABLE_MECHANIC_WHERE
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
          const hasActiveBooking = m.bookings.length > 0;
          const effectiveStatus = getEffectiveMechanicStatus(m.status, hasActiveBooking);

          if (
            m.status !== MechanicStatus.OFFLINE &&
            m.status !== effectiveStatus
          ) {
            syncMechanicStatus(m.id).catch(() => {});
          }

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
            status: effectiveStatus,
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

      const activeBooking = await prisma.booking.findFirst({
        where: {
          mechanicId: mechanic.id,
          status: { in: ACTIVE_STATUSES },
        },
        select: { id: true },
      });
      const effectiveStatus = getEffectiveMechanicStatus(
        mechanic.status,
        !!activeBooking
      );

      if (
        mechanic.status !== MechanicStatus.OFFLINE &&
        mechanic.status !== effectiveStatus
      ) {
        syncMechanicStatus(mechanic.id).catch(() => {});
      }

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
        status: effectiveStatus,
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
