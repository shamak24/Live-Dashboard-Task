import { BookingStatus } from "@prisma/client";
import type { getBookingById } from "./bookingService.js";
import { recordActivityLog } from "./activityLogService.js";

type BookingSnapshot = NonNullable<Awaited<ReturnType<typeof getBookingById>>>;

function shortBookingId(id: string) {
  return id.slice(0, 8).toUpperCase();
}

function formatStatus(status: BookingStatus | string) {
  return status.replace(/_/g, " ").toLowerCase();
}

export function logBookingCreated(booking: BookingSnapshot) {
  recordActivityLog(
    `New ${booking.serviceCategory.name} booking added for ${booking.customer.user.name}`
  );
}

export function logBookingStatusChange(
  booking: BookingSnapshot,
  previousStatus: BookingStatus,
  options?: { source?: "demo" | "user" }
) {
  const prefix = options?.source === "demo" ? "Demo: " : "";
  const ref = shortBookingId(booking.id);
  const customer = booking.customer.user.name;
  const service = booking.serviceCategory.name;

  if (
    booking.status === BookingStatus.ASSIGNED &&
    previousStatus === BookingStatus.PENDING &&
    booking.mechanic
  ) {
    recordActivityLog(
      `${prefix}Assigned ${service} for ${customer} to ${booking.mechanic.user.name}`
    );
    return;
  }

  if (booking.status === BookingStatus.COMPLETED) {
    recordActivityLog(
      `${prefix}Completed ${service} for ${customer} (booking ${ref})`
    );
    return;
  }

  if (booking.status === BookingStatus.CANCELLED) {
    recordActivityLog(
      `${prefix}Cancelled ${service} booking for ${customer} (${ref})`
    );
    return;
  }

  recordActivityLog(
    `${prefix}Booking ${ref} (${service}) moved to ${formatStatus(booking.status)}`
  );
}

export function logUserRegistered(name: string, role: "CUSTOMER" | "MECHANIC") {
  if (role === "MECHANIC") {
    recordActivityLog(`New mechanic joined: ${name}`);
  } else {
    recordActivityLog(`New customer registered: ${name}`);
  }
}
