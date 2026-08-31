import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { authenticate, requireRoles } from "../middleware/auth.js";

const router = Router();

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

export default router;
