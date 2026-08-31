import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
const [bookings, users, customers, mechanics] = await Promise.all([
  p.booking.count(),
  p.user.count(),
  p.customer.count(),
  p.mechanic.count(),
]);
console.log(JSON.stringify({ bookings, users, customers, mechanics }));
await p.$disconnect();
