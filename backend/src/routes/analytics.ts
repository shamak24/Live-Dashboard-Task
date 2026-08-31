import { Router } from "express";
import { BookingStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate, requireRoles } from "../middleware/auth.js";

const router = Router();

const dateRangeSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

function getDateRange(query: z.infer<typeof dateRangeSchema>) {
  const end = query.endDate ? new Date(query.endDate) : new Date();
  const start = query.startDate
    ? new Date(query.startDate)
    : new Date(end.getTime() - 180 * 24 * 60 * 60 * 1000);
  return { start, end };
}

/**
 * @openapi
 * /api/analytics/bookings-over-time:
 *   get:
 *     summary: Bookings count grouped by day
 *     tags: [Analytics]
 */
router.get(
  "/bookings-over-time",
  authenticate,
  requireRoles("ADMIN"),
  async (req, res, next) => {
    try {
      const query = dateRangeSchema.parse(req.query);
      const { start, end } = getDateRange(query);

      const bookings = await prisma.booking.findMany({
        where: { createdAt: { gte: start, lte: end } },
        select: { createdAt: true },
        orderBy: { createdAt: "asc" },
      });

      const grouped: Record<string, number> = {};
      for (const b of bookings) {
        const key = b.createdAt.toISOString().split("T")[0];
        grouped[key] = (grouped[key] ?? 0) + 1;
      }

      const data = Object.entries(grouped).map(([date, count]) => ({
        date,
        count,
      }));

      res.json({ data });
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  "/revenue-over-time",
  authenticate,
  requireRoles("ADMIN"),
  async (req, res, next) => {
    try {
      const query = dateRangeSchema.parse(req.query);
      const { start, end } = getDateRange(query);

      const bookings = await prisma.booking.findMany({
        where: {
          status: BookingStatus.COMPLETED,
          scheduledAt: { gte: start, lte: end },
        },
        select: { scheduledAt: true, amount: true },
        orderBy: { scheduledAt: "asc" },
      });

      const grouped: Record<string, number> = {};
      for (const b of bookings) {
        const key = b.scheduledAt.toISOString().split("T")[0];
        grouped[key] = (grouped[key] ?? 0) + Number(b.amount);
      }

      const data = Object.entries(grouped).map(([date, revenue]) => ({
        date,
        revenue,
      }));

      res.json({ data });
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  "/status-breakdown",
  authenticate,
  requireRoles("ADMIN"),
  async (req, res, next) => {
    try {
      const query = dateRangeSchema.parse(req.query);
      const { start, end } = getDateRange(query);

      const groups = await prisma.booking.groupBy({
        by: ["status"],
        where: { createdAt: { gte: start, lte: end } },
        _count: { status: true },
      });

      const data = groups.map((g) => ({
        status: g.status,
        count: g._count.status,
      }));

      res.json({ data });
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  "/category-breakdown",
  authenticate,
  requireRoles("ADMIN"),
  async (req, res, next) => {
    try {
      const query = dateRangeSchema.parse(req.query);
      const { start, end } = getDateRange(query);

      const bookings = await prisma.booking.findMany({
        where: { createdAt: { gte: start, lte: end } },
        include: { serviceCategory: { select: { name: true } } },
      });

      const grouped: Record<string, number> = {};
      for (const b of bookings) {
        const name = b.serviceCategory.name;
        grouped[name] = (grouped[name] ?? 0) + 1;
      }

      const data = Object.entries(grouped).map(([category, count]) => ({
        category,
        count,
      }));

      res.json({ data });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
