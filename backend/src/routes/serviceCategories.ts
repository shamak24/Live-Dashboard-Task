import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

router.get("/", authenticate, async (_req, res, next) => {
  try {
    const data = await prisma.serviceCategory.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, description: true, basePrice: true },
    });
    res.json({
      data: data.map((c) => ({
        ...c,
        basePrice: Number(c.basePrice),
      })),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
