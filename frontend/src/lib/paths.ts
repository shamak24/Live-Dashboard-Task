export const APP_BASE = "/app";

export const paths = {
  home: APP_BASE,
  analytics: `${APP_BASE}/analytics`,
  bookings: `${APP_BASE}/bookings`,
  bookingsNew: `${APP_BASE}/bookings/new`,
  booking: (id: string) => `${APP_BASE}/bookings/${id}`,
  mechanics: `${APP_BASE}/mechanics`,
  mechanic: (id: string) => `${APP_BASE}/mechanics/${id}`,
  customers: `${APP_BASE}/customers`,
  login: "/login",
  loginAdmin: "/login?mode=admin",
  signup: "/signup",
  landing: "/",
};
