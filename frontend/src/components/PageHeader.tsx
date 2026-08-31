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
        "flex flex-col gap-3 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between",
        className
      )}
    >
      <div>
        <h1 className="text-section font-semibold tracking-tight md:text-[20px]">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-body text-muted-foreground">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
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
      <div className="ops-panel px-5 py-4">
        <p className="text-meta">{label}</p>
        <p className="mt-2 font-mono text-[36px] font-semibold tabular-nums leading-none text-foreground">
          {value}
        </p>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div className="ops-panel px-4 py-3">
        <p className="text-meta">{label}</p>
        <p className="mt-1 font-mono text-[28px] font-semibold tabular-nums leading-tight">
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
