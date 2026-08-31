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
        "flex flex-col gap-3 border-b border-border pb-4 sm:pb-6 sm:flex-row sm:items-end sm:justify-between",
        className
      )}
    >
      <div>
        <h1 className="text-lg font-semibold tracking-tight sm:text-section md:text-[20px]">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-body text-muted-foreground">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0 w-full sm:w-auto">{action}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  variant = "default",
}: {
  label: string;
  value: string;
  variant?: "default" | "hero" | "compact";
}) {
  if (variant === "hero") {
    return (
      <div className="ops-stat-hero px-4 py-4">
        <p className="text-meta">{label}</p>
        <p className="mt-2 font-mono text-[28px] sm:text-[36px] font-semibold tabular-nums leading-none text-foreground">
          {value}
        </p>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div className="ops-panel px-4 py-3">
        <p className="text-meta">{label}</p>
        <p className="mt-1 font-mono text-2xl sm:text-[28px] font-semibold tabular-nums leading-tight">
          {value}
        </p>
      </div>
    );
  }

  return (
    <div className="ops-panel px-4 py-3">
      <p className="text-meta">{label}</p>
      <p className="mt-1 font-mono text-[28px] font-semibold tabular-nums">{value}</p>
    </div>
  );
}
