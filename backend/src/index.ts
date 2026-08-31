import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import swaggerUi from "swagger-ui-express";
import { createServer } from "http";
import { Server } from "socket.io";
import { swaggerSpec } from "./config/swagger.js";
import { errorHandler } from "./middleware/errorHandler.js";
import authRoutes from "./routes/auth.js";
import dashboardRoutes from "./routes/dashboard.js";
import bookingsRoutes from "./routes/bookings.js";
import mechanicsRoutes from "./routes/mechanics.js";
import customersRoutes from "./routes/customers.js";
import analyticsRoutes from "./routes/analytics.js";

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

const io = new Server(httpServer, {
  cors: {
    origin: FRONTEND_URL,
    credentials: true,
  },
});

app.set("io", io);

io.on("connection", (socket) => {
  console.log(`Socket connected: ${socket.id}`);
  socket.on("disconnect", () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
});

app.use("/api", limiter);

/**
 * @openapi
 * /health:
 *   get:
 *     summary: Health check for uptime monitoring
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Server is healthy
 */
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get("/api-docs.json", (_req, res) => {
  res.json(swaggerSpec);
});

app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/bookings", bookingsRoutes);
app.use("/api/mechanics", mechanicsRoutes);
app.use("/api/customers", customersRoutes);
app.use("/api/analytics", analyticsRoutes);

// Admin demo endpoint to trigger live booking simulation
app.post("/api/demo/simulate", async (_req, res) => {
  try {
    const { simulateBookingAdvance } = await import(
      "./scripts/simulateBookings.js"
    );
    const count = await simulateBookingAdvance(io);
    res.json({ simulated: count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Simulation failed" });
  }
});

app.use(errorHandler);

httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`API docs at http://localhost:${PORT}/api-docs`);
});

export { app, io };
