import { BookingStatus } from "@prisma/client";
import type { Server } from "socket.io";
import { prisma } from "../lib/prisma.js";
import { bookingInclude, updateBookingStatus } from "../services/bookingService.js";

const STATUS_ADVANCE: Partial<Record<BookingStatus, BookingStatus>> = {
  PENDING: BookingStatus.ASSIGNED,
  ASSIGNED: BookingStatus.MECHANIC_ON_THE_WAY,
  MECHANIC_ON_THE_WAY: BookingStatus.IN_PROGRESS,
  IN_PROGRESS: BookingStatus.COMPLETED,
};

/**
 * Randomly advance a few active bookings for live demo visibility.
 * Can be triggered via POST /api/demo/simulate or run as a cron script.
 */
export async function simulateBookingAdvance(io?: Server): Promise<number> {
  const activeBookings = await prisma.booking.findMany({
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
    take: 20,
    include: bookingInclude,
  });

  if (activeBookings.length === 0) return 0;

  // Pick up to 3 random bookings to advance
  const shuffled = activeBookings.sort(() => Math.random() - 0.5);
  const toAdvance = shuffled.slice(0, Math.min(3, shuffled.length));
  let count = 0;

  for (const booking of toAdvance) {
    const nextStatus = STATUS_ADVANCE[booking.status];
    if (!nextStatus) continue;

    try {
      let mechanicId = booking.mechanicId;

      // Auto-assign mechanic if advancing from PENDING
      if (booking.status === BookingStatus.PENDING && !mechanicId) {
        const available = await prisma.mechanic.findFirst({
          where: { status: "AVAILABLE" },
        });
        if (!available) continue;
        mechanicId = available.id;
      }

      const updated = await updateBookingStatus(
        booking.id,
        nextStatus,
        nextStatus === BookingStatus.ASSIGNED ? mechanicId ?? undefined : undefined,
        booking.version
      );

      const payload = { ...updated, amount: Number(updated.amount) };

      if (io) {
        io.emit("booking:updated", payload);
      }

      count++;
    } catch (err) {
      console.error(`Failed to advance booking ${booking.id}:`, err);
    }
  }

  return count;
}

// Allow running standalone: bun src/scripts/simulateBookings.ts
if (import.meta.main) {
  const count = await simulateBookingAdvance();
  console.log(`Advanced ${count} bookings`);
  process.exit(0);
}
