import { BookingStatus, MechanicStatus, Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

export const MECHANIC_ACTIVE_BOOKING_STATUSES: BookingStatus[] = [
  BookingStatus.ASSIGNED,
  BookingStatus.MECHANIC_ON_THE_WAY,
  BookingStatus.IN_PROGRESS,
];

/**
 * Status shown in ops UI — active booking always means on job, even if DB row is stale.
 */
export function getEffectiveMechanicStatus(
  storedStatus: MechanicStatus,
  hasActiveBooking: boolean
): MechanicStatus {
  if (hasActiveBooking) return MechanicStatus.ON_JOB;
  if (storedStatus === MechanicStatus.OFFLINE) return MechanicStatus.OFFLINE;
  return MechanicStatus.AVAILABLE;
}

/**
 * Align stored mechanic.status with active bookings (skips OFFLINE mechanics).
 */
export async function syncMechanicStatus(
  mechanicId: string,
  client: Prisma.TransactionClient | typeof prisma = prisma
) {
  const mechanic = await client.mechanic.findUnique({
    where: { id: mechanicId },
    select: { id: true, status: true },
  });
  if (!mechanic || mechanic.status === MechanicStatus.OFFLINE) return;

  const activeBooking = await client.booking.findFirst({
    where: {
      mechanicId,
      status: { in: MECHANIC_ACTIVE_BOOKING_STATUSES },
    },
    select: { id: true },
  });

  const nextStatus = activeBooking
    ? MechanicStatus.ON_JOB
    : MechanicStatus.AVAILABLE;

  if (mechanic.status !== nextStatus) {
    await client.mechanic.update({
      where: { id: mechanicId },
      data: { status: nextStatus },
    });
  }
}

export async function syncAllMechanicStatuses() {
  const mechanics = await prisma.mechanic.findMany({
    where: { status: { not: MechanicStatus.OFFLINE } },
    select: { id: true },
  });

  for (const { id } of mechanics) {
    await syncMechanicStatus(id);
  }
}
