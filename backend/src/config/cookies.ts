import type { CookieOptions } from "express";

const AUTH_COOKIE_NAME = "token";
const AUTH_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/** Cross-origin SPA (Vercel + Render) needs Secure + SameSite=None cookies */
function isSecureCookieContext(): boolean {
  return (
    process.env.NODE_ENV === "production" ||
    process.env.FRONTEND_URL?.includes("https://") === true
  );
}

export function getAuthCookieName(): string {
  return AUTH_COOKIE_NAME;
}

export function getAuthCookieOptions(): CookieOptions {
  const secure = isSecureCookieContext();

  return {
    httpOnly: true,
    secure,
    sameSite: secure ? "none" : "lax",
    maxAge: AUTH_MAX_AGE_MS,
    path: "/",
  };
}
