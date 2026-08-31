import { BookingStatus, MechanicStatus, Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { createError } from "../middleware/errorHandler.js";
import {
  generatePostVisitSummary,
  generatePreVisitSummary,
} from "../services/llmService.js";

const ACTIVE_STATUSES: BookingStatus[] = [
  BookingStatus.ASSIGNED,
  BookingStatus.MECHANIC_ON_THE_WAY,
  BookingStatus.IN_PROGRESS,
];

const STATUS_FLOW: Record<BookingStatus, BookingStatus[]> = {
  PENDING: [BookingStatus.ASSIGNED, BookingStatus.CANCELLED],
  ASSIGNED: [
    BookingStatus.MECHANIC_ON_THE_WAY,
    BookingStatus.CANCELLED,
    BookingStatus.IN_PROGRESS,
  ],
  MECHANIC_ON_THE_WAY: [BookingStatus.IN_PROGRESS, BookingStatus.CANCELLED],
  IN_PROGRESS: [BookingStatus.COMPLETED, BookingStatus.CANCELLED],
  COMPLETED: [],
  CANCELLED: [],
};

export const bookingInclude = {
  customer: {
    include: { user: { select: { id: true, name: true, email: true } } },
  },
  vehicle: true,
  mechanic: {
    include: { user: { select: { id: true, name: true, email: true } } },
  },
  serviceCategory: true,
} satisfies Prisma.BookingInclude;

function formatBookingForLlm(booking: Awaited<ReturnType<typeof getBookingById>>) {
  if (!booking) return null;
  return {
    id: booking.id,
    status: booking.status,
    amount: booking.amount.toString(),
    scheduledAt: booking.scheduledAt,
    customer: {
      name: booking.customer.user.name,
      phone: booking.customer.phone,
      address: booking.customer.address,
    },
    vehicle: booking.vehicle,
    serviceCategory: booking.serviceCategory,
    mechanic: booking.mechanic
      ? {
          name: booking.mechanic.user.name,
          specialty: booking.mechanic.specialty,
        }
      : undefined,
  };
}

export async function getBookingById(id: string) {
  return prisma.booking.findUnique({
    where: { id },
    include: bookingInclude,
  });
}

/**
 * Assign mechanic with row-level locking to prevent double-booking.
 * Uses SELECT FOR UPDATE inside a transaction for concurrency safety.
 */
async function assignMechanicWithLock(
  bookingId: string,
  mechanicId: string,
  expectedVersion: number
) {
  return prisma.$transaction(async (tx) => {
    // Lock the mechanic row to prevent concurrent assignments
    const lockedMechanic = await tx.$queryRaw<
      { id: string; status: string }[]
    >`
      SELECT id, status FROM "Mechanic"
      WHERE id = ${mechanicId}
      FOR UPDATE
    `;

    if (!lockedMechanic.length) {
      throw createError("Mechanic not found", 404);
    }

    // Check for overlapping active bookings on this mechanic
    const activeBooking = await tx.booking.findFirst({
      where: {
        mechanicId,
        status: { in: ACTIVE_STATUSES },
        id: { not: bookingId },
      },
    });

    if (activeBooking) {
      throw createError(
        "Mechanic already has an active booking — cannot double-book",
        409,
        { existingBookingId: activeBooking.id }
      );
    }

    const booking = await tx.booking.findUnique({ where: { id: bookingId } });
    if (!booking) {
      throw createError("Booking not found", 404);
    }

    if (booking.version !== expectedVersion) {
      throw createError(
        "Booking was modified by another request — please retry",
        409
      );
    }

    const updated = await tx.booking.update({
      where: { id: bookingId },
      data: {
        mechanicId,
        status: BookingStatus.ASSIGNED,
        version: { increment: 1 },
      },
      include: bookingInclude,
    });

    await tx.mechanic.update({
      where: { id: mechanicId },
      data: { status: MechanicStatus.ON_JOB },
    });

    return updated;
  });
}

export async function updateBookingStatus(
  bookingId: string,
  newStatus: BookingStatus,
  mechanicId?: string,
  expectedVersion?: number
) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: bookingInclude,
  });

  if (!booking) {
    throw createError("Booking not found", 404);
  }

  const allowed = STATUS_FLOW[booking.status];
  if (!allowed.includes(newStatus)) {
    throw createError(
      `Cannot transition from ${booking.status} to ${newStatus}`,
      400
    );
  }

  // Assigning mechanic uses dedicated locked transaction
  if (newStatus === BookingStatus.ASSIGNED && mechanicId) {
    return assignMechanicWithLock(
      bookingId,
      mechanicId,
      expectedVersion ?? booking.version
    );
  }

  const updated = await prisma.$transaction(async (tx) => {
    const current = await tx.booking.findUnique({ where: { id: bookingId } });
    if (!current) throw createError("Booking not found", 404);

    if (expectedVersion !== undefined && current.version !== expectedVersion) {
      throw createError(
        "Booking was modified by another request — please retry",
        409
      );
    }

  const data: Prisma.BookingUpdateInput = {
      status: newStatus,
      version: { increment: 1 },
    };

    const result = await tx.booking.update({
      where: { id: bookingId },
      data,
      include: bookingInclude,
    });

    // Update mechanic status based on booking lifecycle
    if (result.mechanicId) {
      if (newStatus === BookingStatus.COMPLETED) {
        await tx.mechanic.update({
          where: { id: result.mechanicId },
          data: {
            status: MechanicStatus.AVAILABLE,
            jobsCompleted: { increment: 1 },
          },
        });
      } else if (ACTIVE_STATUSES.includes(newStatus)) {
        await tx.mechanic.update({
          where: { id: result.mechanicId },
          data: { status: MechanicStatus.ON_JOB },
        });
      }
    }

    return result;
  });

  // LLM summaries — non-blocking, failures logged
  try {
    if (newStatus === BookingStatus.ASSIGNED && !updated.preVisitSummary) {
      const ctx = formatBookingForLlm(updated);
      if (ctx) {
        const summary = await generatePreVisitSummary(ctx);
        if (summary) {
          await prisma.booking.update({
            where: { id: bookingId },
            data: { preVisitSummary: summary },
          });
          updated.preVisitSummary = summary;
        }
      }
    }

    if (newStatus === BookingStatus.COMPLETED && !updated.postVisitSummary) {
      const ctx = formatBookingForLlm(updated);
      if (ctx) {
        const summary = await generatePostVisitSummary(ctx);
        if (summary) {
          await prisma.booking.update({
            where: { id: bookingId },
            data: { postVisitSummary: summary },
          });
          updated.postVisitSummary = summary;
        }
      }
    }
  } catch (err) {
    console.error("LLM summary generation failed (non-blocking):", err);
  }

  return updated;
}

export async function retryBookingSummary(
  bookingId: string,
  type: "pre" | "post"
) {
  const booking = await getBookingById(bookingId);
  if (!booking) throw createError("Booking not found", 404);

  const ctx = formatBookingForLlm(booking);
  if (!ctx) throw createError("Invalid booking data", 400);

  const { retrySummary } = await import("../services/llmService.js");
  const summary = await retrySummary(ctx, type);

  if (!summary) {
    throw createError("Failed to generate summary — check API keys", 503);
  }

  const field = type === "pre" ? "preVisitSummary" : "postVisitSummary";
  return prisma.booking.update({
    where: { id: bookingId },
    data: { [field]: summary },
    include: bookingInclude,
  });
}
