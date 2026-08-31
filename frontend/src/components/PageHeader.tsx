import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "animate-fade-in-up flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between",
        className
      )}
    >
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  icon: Icon,
  index = 0,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  index?: number;
}) {
  return (
    <div
      className={cn(
        "card-interactive animate-fade-in-up rounded-lg border border-border bg-card text-card-foreground shadow-sm",
        `stagger-${Math.min(index + 1, 8)}`
      )}
    >
      <div className="flex flex-row items-center justify-between p-6 pb-2">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <Icon className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
      </div>
      <div className="p-6 pt-0">
        <p className="text-2xl font-bold tracking-tight tabular-nums">{value}</p>
      </div>
    </div>
  );
}
