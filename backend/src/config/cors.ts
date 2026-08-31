import type { CorsOptions } from "cors";

const DEFAULT_FRONTEND_URL = "http://localhost:5173";

/** Strip trailing slashes so env typos don't break origin matching */
export function normalizeOrigin(origin: string): string {
  return origin.trim().replace(/\/+$/, "");
}

export function getAllowedOrigins(): string[] {
  const fromEnv =
    process.env.FRONTEND_URL?.split(",").map((o) => normalizeOrigin(o)) ?? [];
  const defaults = [
    DEFAULT_FRONTEND_URL,
    "http://127.0.0.1:5173",
    "http://localhost:5173",
    "http://127.0.0.1:4173",
    "http://localhost:4173",
  ];
  return [...new Set([...fromEnv, ...defaults].map(normalizeOrigin).filter(Boolean))];
}

export function createCorsOptions(): CorsOptions {
  const allowedOrigins = getAllowedOrigins();

  return {
    origin(origin, callback) {
      // Same-origin / server-to-server requests (no Origin header)
      if (!origin) {
        callback(null, true);
        return;
      }

      const normalized = normalizeOrigin(origin);

      if (
        allowedOrigins.includes(normalized) ||
        (process.env.NODE_ENV === "development" &&
          /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(normalized))
      ) {
        callback(null, origin);
        return;
      }

      console.warn(
        `[CORS] Blocked origin: ${origin}. Allowed: ${allowedOrigins.join(", ")}`
      );
      callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  };
}

export function applyCorsHeaders(req: { headers: { origin?: string } }, res: {
  setHeader: (name: string, value: string) => void;
}) {
  const allowedOrigins = getAllowedOrigins();
  const origin = req.headers.origin;
  const normalized = origin ? normalizeOrigin(origin) : undefined;

  if (!origin || allowedOrigins.includes(normalized!)) {
    res.setHeader("Access-Control-Allow-Origin", origin ?? DEFAULT_FRONTEND_URL);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }
}
