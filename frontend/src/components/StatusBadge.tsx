import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  ASSIGNED: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  MECHANIC_ON_THE_WAY: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300",
  IN_PROGRESS: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  COMPLETED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  CANCELLED: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  ASSIGNED: "Assigned",
  MECHANIC_ON_THE_WAY: "On the Way",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export function StatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        STATUS_COLORS[status] ?? "bg-muted text-muted-foreground",
        className
      )}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    PENDING: "#f59e0b",
    ASSIGNED: "#3b82f6",
    MECHANIC_ON_THE_WAY: "#6366f1",
    IN_PROGRESS: "#a855f7",
    COMPLETED: "#10b981",
    CANCELLED: "#ef4444",
  };
  return map[status] ?? "#94a3b8";
}
