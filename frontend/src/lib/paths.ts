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
  customer: (id: string) => `${APP_BASE}/customers/${id}`,
  profile: `${APP_BASE}/profile`,
  customerBook: `${APP_BASE}/book`,
  customerHistory: `${APP_BASE}/history`,
  customerVehicles: `${APP_BASE}/vehicles`,
  customerAccount: `${APP_BASE}/account`,
  login: "/login",
  loginAdmin: "/login?mode=admin",
  signup: "/signup",
  landing: "/",
};
