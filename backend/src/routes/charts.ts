import { Router } from "express";
import { BookingStatus, Prisma } from "@prisma/client";
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

async function getBookingsOverTime(start: Date, end: Date) {
  const rows = await prisma.$queryRaw<{ date: string; count: number }[]>(
    Prisma.sql`
      SELECT DATE("createdAt")::text AS date, COUNT(*)::int AS count
      FROM "Booking"
      WHERE "createdAt" >= ${start} AND "createdAt" <= ${end}
      GROUP BY DATE("createdAt")
      ORDER BY date ASC
    `
  );
  return rows;
}

async function getRevenueOverTime(start: Date, end: Date) {
  const rows = await prisma.$queryRaw<{ date: string; revenue: number }[]>(
    Prisma.sql`
      SELECT DATE("scheduledAt")::text AS date, SUM("amount")::float AS revenue
      FROM "Booking"
      WHERE status = 'COMPLETED'
        AND "scheduledAt" >= ${start}
        AND "scheduledAt" <= ${end}
      GROUP BY DATE("scheduledAt")
      ORDER BY date ASC
    `
  );
  return rows.map((r) => ({ date: r.date, revenue: Number(r.revenue) }));
}

async function getStatusBreakdown(start: Date, end: Date) {
  const groups = await prisma.booking.groupBy({
    by: ["status"],
    where: { createdAt: { gte: start, lte: end } },
    _count: { status: true },
  });
  return groups.map((g) => ({
    status: g.status,
    count: g._count.status,
  }));
}

async function getCategoryBreakdown(start: Date, end: Date) {
  const groups = await prisma.booking.groupBy({
    by: ["serviceCategoryId"],
    where: { createdAt: { gte: start, lte: end } },
    _count: { serviceCategoryId: true },
  });

  const categories = await prisma.serviceCategory.findMany({
    where: { id: { in: groups.map((g) => g.serviceCategoryId) } },
    select: { id: true, name: true },
  });

  const nameById = new Map(categories.map((c) => [c.id, c.name]));

  return groups.map((g) => ({
    category: nameById.get(g.serviceCategoryId) ?? "Unknown",
    count: g._count.serviceCategoryId,
  }));
}

/**
 * @openapi
 * /api/dashboard/charts/summary:
 *   get:
 *     summary: All analytics chart data in one request
 *     tags: [Analytics]
 */
router.get(
  "/summary",
  authenticate,
  requireRoles("ADMIN"),
  async (req, res, next) => {
    try {
      const query = dateRangeSchema.parse(req.query);
      const { start, end } = getDateRange(query);

      const [bookingsOverTime, revenueOverTime, statusBreakdown, categoryBreakdown] =
        await Promise.all([
          getBookingsOverTime(start, end),
          getRevenueOverTime(start, end),
          getStatusBreakdown(start, end),
          getCategoryBreakdown(start, end),
        ]);

      res.json({
        bookingsOverTime,
        revenueOverTime,
        statusBreakdown,
        categoryBreakdown,
      });
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  "/bookings-over-time",
  authenticate,
  requireRoles("ADMIN"),
  async (req, res, next) => {
    try {
      const query = dateRangeSchema.parse(req.query);
      const { start, end } = getDateRange(query);
      const data = await getBookingsOverTime(start, end);
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
      const data = await getRevenueOverTime(start, end);
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
      const data = await getStatusBreakdown(start, end);
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
      const data = await getCategoryBreakdown(start, end);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
