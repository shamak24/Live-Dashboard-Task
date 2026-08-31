import { getStatusBadgeClass, getStatusLabel, getStatusHex } from "@/lib/statusColors";
import { cn } from "@/lib/utils";

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
        "inline-flex items-center rounded-[8px] px-2 py-0.5 text-xs font-medium",
        getStatusBadgeClass(status),
        className
      )}
    >
      {getStatusLabel(status)}
    </span>
  );
}

export function getStatusColor(status: string): string {
  return getStatusHex(status);
}
