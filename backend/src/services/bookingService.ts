import { BookingStatus, MechanicStatus, Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { createError } from "../middleware/errorHandler.js";
import {
  generatePostVisitSummary,
  generatePreVisitSummary,
} from "../services/llmService.js";
import { MECHANIC_ACTIVE_BOOKING_STATUSES } from "../services/mechanicService.js";
import {
  logBookingCreated,
  logBookingStatusChange,
} from "../services/activityLogHelpers.js";

const TRANSACTION_OPTIONS = {
  maxWait: 10_000,
  timeout: 15_000,
};

const ACTIVE_STATUSES = MECHANIC_ACTIVE_BOOKING_STATUSES;

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

export async function createBooking(input: {
  customerId: string;
  vehicleId?: string;
  vehicle?: {
    make: string;
    model: string;
    year: number;
    plate: string;
  };
  serviceCategoryId: string;
  scheduledAt: Date;
}) {
  let vehicleId = input.vehicleId;

  if (!vehicleId && input.vehicle) {
    const createdVehicle = await prisma.vehicle.create({
      data: {
        customerId: input.customerId,
        make: input.vehicle.make.trim(),
        model: input.vehicle.model.trim(),
        year: input.vehicle.year,
        plate: input.vehicle.plate.trim().toUpperCase(),
      },
    });
    vehicleId = createdVehicle.id;
  }

  if (!vehicleId) {
    throw createError("A vehicle is required to book a service", 400);
  }

  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, customerId: input.customerId },
  });
  if (!vehicle) {
    throw createError("Vehicle not found for this customer", 404);
  }

  const category = await prisma.serviceCategory.findUnique({
    where: { id: input.serviceCategoryId },
  });
  if (!category) {
    throw createError("Service category not found", 404);
  }

  if (input.scheduledAt.getTime() <= Date.now()) {
    throw createError("Scheduled time must be in the future", 400);
  }

  const created = await prisma.booking.create({
    data: {
      customerId: input.customerId,
      vehicleId: vehicle.id,
      serviceCategoryId: input.serviceCategoryId,
      scheduledAt: input.scheduledAt,
      amount: category.basePrice,
      status: BookingStatus.PENDING,
    },
    include: bookingInclude,
  });

  logBookingCreated(created);

  return created;
}

function isPrismaError(
  err: unknown,
  code: string
): err is Prisma.PrismaClientKnownRequestError {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError && err.code === code
  );
}

async function applyLlmSummaries(
  bookingId: string,
  updated: NonNullable<Awaited<ReturnType<typeof getBookingById>>>,
  newStatus: BookingStatus
) {
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

/**
 * Assign mechanic with a short transaction safe for Neon pooler connections.
 * Double-booking is prevented by the active-booking check plus DB partial unique index.
 */
async function assignMechanicWithLock(
  bookingId: string,
  mechanicId: string,
  expectedVersion: number
) {
  try {
    await prisma.$transaction(async (tx) => {
      const mechanic = await tx.mechanic.findUnique({
        where: { id: mechanicId },
        select: { id: true, status: true },
      });
      if (!mechanic) {
        throw createError("Mechanic not found", 404);
      }
      if (mechanic.status === MechanicStatus.OFFLINE) {
        throw createError("Mechanic is offline and cannot be assigned", 400);
      }

      const activeBooking = await tx.booking.findFirst({
        where: {
          mechanicId,
          status: { in: ACTIVE_STATUSES },
          id: { not: bookingId },
        },
        select: { id: true },
      });

      if (activeBooking) {
        throw createError(
          "Mechanic already has an active booking — cannot double-book",
          409,
          { existingBookingId: activeBooking.id }
        );
      }

      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        select: { id: true, version: true },
      });
      if (!booking) {
        throw createError("Booking not found", 404);
      }

      if (booking.version !== expectedVersion) {
        throw createError(
          "Booking was modified by another request — please retry",
          409
        );
      }

      await tx.booking.update({
        where: { id: bookingId },
        data: {
          mechanicId,
          status: BookingStatus.ASSIGNED,
          version: { increment: 1 },
        },
      });

      await tx.mechanic.update({
        where: { id: mechanicId },
        data: { status: MechanicStatus.ON_JOB },
      });
    }, TRANSACTION_OPTIONS);
  } catch (err) {
    if (isPrismaError(err, "P2002")) {
      throw createError(
        "Mechanic already has an active booking — cannot double-book",
        409
      );
    }
    if (isPrismaError(err, "P2028")) {
      throw createError(
        "Database transaction timed out — please retry the assignment",
        503
      );
    }
    throw err;
  }

  const updated = await getBookingById(bookingId);
  if (!updated) {
    throw createError("Booking not found", 404);
  }
  return updated;
}

export async function updateBookingStatus(
  bookingId: string,
  newStatus: BookingStatus,
  mechanicId?: string,
  expectedVersion?: number,
  logOptions?: { source?: "demo" | "user" }
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
    const assigned = await assignMechanicWithLock(
      bookingId,
      mechanicId,
      expectedVersion ?? booking.version
    );
    const withSummaries = await applyLlmSummaries(bookingId, assigned, newStatus);
    logBookingStatusChange(withSummaries, booking.status, logOptions);
    return withSummaries;
  }

  try {
    await prisma.$transaction(async (tx) => {
      const current = await tx.booking.findUnique({
        where: { id: bookingId },
        select: { id: true, version: true, mechanicId: true },
      });
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

      await tx.booking.update({
        where: { id: bookingId },
        data,
      });

      if (current.mechanicId) {
        if (newStatus === BookingStatus.COMPLETED) {
          await tx.mechanic.update({
            where: { id: current.mechanicId },
            data: {
              status: MechanicStatus.AVAILABLE,
              jobsCompleted: { increment: 1 },
            },
          });
        } else if (newStatus === BookingStatus.CANCELLED) {
          const otherActive = await tx.booking.findFirst({
            where: {
              mechanicId: current.mechanicId,
              status: { in: ACTIVE_STATUSES },
              id: { not: bookingId },
            },
            select: { id: true },
          });
          if (!otherActive) {
            await tx.mechanic.update({
              where: { id: current.mechanicId },
              data: { status: MechanicStatus.AVAILABLE },
            });
          }
        } else if (ACTIVE_STATUSES.includes(newStatus)) {
          await tx.mechanic.update({
            where: { id: current.mechanicId },
            data: { status: MechanicStatus.ON_JOB },
          });
        }
      }
    }, TRANSACTION_OPTIONS);
  } catch (err) {
    if (isPrismaError(err, "P2028")) {
      throw createError(
        "Database transaction timed out — please retry the status update",
        503
      );
    }
    throw err;
  }

  const updated = await getBookingById(bookingId);
  if (!updated) throw createError("Booking not found", 404);

  logBookingStatusChange(updated, booking.status, logOptions);

  return applyLlmSummaries(bookingId, updated, newStatus);
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
