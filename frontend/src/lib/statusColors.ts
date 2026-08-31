/** Unified booking status colors — identical in light/dark per design spec */
export const BOOKING_STATUS = {
  PENDING: {
    hex: "#9BA0AC",
    label: "Pending",
    badge:
      "bg-[color-mix(in_srgb,var(--status-pending)_14%,transparent)] text-[var(--status-pending)] border border-[color-mix(in_srgb,var(--status-pending)_30%,transparent)]",
  },
  ASSIGNED: {
    hex: "#2F5DFF",
    label: "Assigned",
    badge:
      "bg-[color-mix(in_srgb,var(--status-assigned)_12%,transparent)] text-[var(--status-assigned)] border border-[color-mix(in_srgb,var(--status-assigned)_28%,transparent)]",
  },
  MECHANIC_ON_THE_WAY: {
    hex: "#E08A2F",
    label: "On the way",
    badge:
      "bg-[color-mix(in_srgb,var(--status-enroute)_14%,transparent)] text-[var(--status-enroute)] border border-[color-mix(in_srgb,var(--status-enroute)_30%,transparent)]",
  },
  IN_PROGRESS: {
    hex: "#8A5CF6",
    label: "In progress",
    badge:
      "bg-[color-mix(in_srgb,var(--status-progress)_12%,transparent)] text-[var(--status-progress)] border border-[color-mix(in_srgb,var(--status-progress)_28%,transparent)]",
  },
  COMPLETED: {
    hex: "#1FA971",
    label: "Completed",
    badge:
      "bg-[color-mix(in_srgb,var(--status-completed)_12%,transparent)] text-[var(--status-completed)] border border-[color-mix(in_srgb,var(--status-completed)_28%,transparent)]",
  },
  CANCELLED: {
    hex: "#E5484D",
    label: "Cancelled",
    badge:
      "bg-[color-mix(in_srgb,var(--status-cancelled)_12%,transparent)] text-[var(--status-cancelled)] border border-[color-mix(in_srgb,var(--status-cancelled)_28%,transparent)]",
  },
} as const;

export function getStatusHex(status: string): string {
  return (
    BOOKING_STATUS[status as keyof typeof BOOKING_STATUS]?.hex ?? "#9BA0AC"
  );
}

export function getStatusLabel(status: string): string {
  return (
    BOOKING_STATUS[status as keyof typeof BOOKING_STATUS]?.label ??
    status.replace(/_/g, " ")
  );
}

export function getStatusBadgeClass(status: string): string {
  return (
    BOOKING_STATUS[status as keyof typeof BOOKING_STATUS]?.badge ??
    "bg-muted text-muted-foreground border border-border"
  );
}
