import { Router } from "express";
import { z } from "zod";
import { BookingStatus } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { authenticate, requireRoles } from "../middleware/auth.js";
import { getRecentActivityLogs } from "../services/activityLogService.js";
import chartsRoutes from "./charts.js";

const router = Router();

router.use("/charts", chartsRoutes);

const activityLogQuerySchema = z.object({
  limit: z.coerce.number().int().min(5).max(15).default(10),
});

/**
 * @openapi
 * /api/dashboard/activity-logs:
 *   get:
 *     summary: Recent ops activity log (admin only, max 15 stored)
 *     tags: [Dashboard]
 */
router.get(
  "/activity-logs",
  authenticate,
  requireRoles("ADMIN"),
  async (req, res, next) => {
    try {
      const { limit } = activityLogQuerySchema.parse(req.query);
      const logs = await getRecentActivityLogs(limit);
      res.json({
        data: logs.map((log) => ({
          ...log,
          createdAt: log.createdAt.toISOString(),
        })),
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @openapi
 * /api/dashboard:
 *   get:
 *     summary: Aggregated dashboard statistics
 *     tags: [Dashboard]
 *     security:
 *       - cookieAuth: []
 */
router.get(
  "/",
  authenticate,
  requireRoles("ADMIN", "MECHANIC", "CUSTOMER"),
  async (_req, res, next) => {
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const [
        totalBookings,
        todayBookings,
        completed,
        pending,
        cancelled,
        revenueResult,
        activeMechanics,
        newCustomers,
      ] = await Promise.all([
        prisma.booking.count(),
        prisma.booking.count({
          where: {
            scheduledAt: { gte: todayStart, lte: todayEnd },
          },
        }),
        prisma.booking.count({ where: { status: BookingStatus.COMPLETED } }),
        prisma.booking.count({
          where: {
            status: {
              in: [
                BookingStatus.PENDING,
                BookingStatus.ASSIGNED,
                BookingStatus.MECHANIC_ON_THE_WAY,
                BookingStatus.IN_PROGRESS,
              ],
            },
          },
        }),
        prisma.booking.count({ where: { status: BookingStatus.CANCELLED } }),
        prisma.booking.aggregate({
          where: { status: BookingStatus.COMPLETED },
          _sum: { amount: true },
        }),
        prisma.mechanic.count({
          where: { status: { in: ["AVAILABLE", "ON_JOB"] } },
        }),
        prisma.customer.count({
          where: { createdAt: { gte: thirtyDaysAgo } },
        }),
      ]);

      res.json({
        totalBookings,
        todayBookings,
        completed,
        pending,
        cancelled,
        totalRevenue: Number(revenueResult._sum.amount ?? 0),
        activeMechanics,
        newCustomers,
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
