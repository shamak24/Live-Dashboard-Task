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

export function formatStatusLabel(status: string): string {
  return status.replace(/_/g, " ");
}
