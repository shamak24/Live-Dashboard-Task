export const STATUS_FLOW: Record<string, string[]> = {
  PENDING: ["ASSIGNED", "CANCELLED"],
  ASSIGNED: ["MECHANIC_ON_THE_WAY", "CANCELLED", "IN_PROGRESS"],
  MECHANIC_ON_THE_WAY: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

export function getNextStatuses(current: string): string[] {
  return STATUS_FLOW[current] ?? [];
}

/** Human-readable labels for status action buttons */
export function getStatusActionLabel(status: string): string {
  switch (status) {
    case "ASSIGNED":
      return "Assign mechanic";
    case "MECHANIC_ON_THE_WAY":
      return "Mark on the way";
    case "IN_PROGRESS":
      return "Mark in progress";
    case "COMPLETED":
      return "Mark completed";
    case "CANCELLED":
      return "Cancel booking";
    default:
      return status.replace(/_/g, " ");
  }
}

export function formatStatusLabel(status: string): string {
  return getStatusActionLabel(status);
}
