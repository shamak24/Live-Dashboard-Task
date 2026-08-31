import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { Role } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { authenticate, signToken, type AuthRequest } from "../middleware/auth.js";
import { createError } from "../middleware/errorHandler.js";
import { logUserRegistered } from "../services/activityLogHelpers.js";
import {
  getAuthCookieName,
  getAuthCookieOptions,
} from "../config/cookies.js";

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["CUSTOMER", "MECHANIC"]).optional(),
  specialty: z.string().max(120).optional(),
});

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     summary: Login and receive JWT cookie
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 */
router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw createError("Invalid email or password", 401);
    }

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    res.cookie(getAuthCookieName(), token, getAuthCookieOptions());

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 */
router.post("/register", async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);
    const existing = await prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existing) {
      throw createError("Email already registered", 409);
    }

    const passwordHash = await bcrypt.hash(data.password, 12);
    const role = (data.role as Role) ?? Role.CUSTOMER;

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
        role,
        ...(role === Role.CUSTOMER && {
          customer: { create: {} },
        }),
        ...(role === Role.MECHANIC && {
          mechanic: {
            create: { specialty: data.specialty?.trim() || "General" },
          },
        }),
      },
    });

    if (role === Role.CUSTOMER || role === Role.MECHANIC) {
      logUserRegistered(user.name, role);
    }

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    res.cookie(getAuthCookieName(), token, getAuthCookieOptions());

    res.status(201).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post("/logout", (_req, res) => {
  res.clearCookie(getAuthCookieName(), getAuthCookieOptions());
  res.json({ success: true });
});

router.get("/me", authenticate, async (req: AuthRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { id: true, name: true, email: true, role: true },
    });
    if (!user) throw createError("User not found", 404);
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

export default router;
