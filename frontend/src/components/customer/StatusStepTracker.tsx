import { cn } from "@/lib/utils";
import { CUSTOMER_TRACKING_STEPS, trackingStepIndex } from "@/lib/customerNav";
import { getStatusHex } from "@/lib/statusColors";

export function StatusStepTracker({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const currentIndex = trackingStepIndex(status);

  return (
    <ol className={cn("flex items-center justify-between gap-1", className)}>
      {CUSTOMER_TRACKING_STEPS.slice(0, 4).map((step, index) => {
        const done = index <= currentIndex;
        const active = index === currentIndex;
        const color = getStatusHex(step.status);

        return (
          <li key={step.status} className="flex flex-1 flex-col items-center gap-2">
            <div className="relative flex w-full items-center justify-center">
              {index > 0 && (
                <span
                  className={cn(
                    "absolute right-1/2 top-1/2 h-0.5 w-full -translate-y-1/2",
                    index <= currentIndex ? "bg-primary/40" : "bg-border"
                  )}
                  style={{ zIndex: 0 }}
                />
              )}
              <span
                className={cn(
                  "relative z-10 flex h-8 w-8 items-center justify-center rounded-full text-meta font-semibold transition-all",
                  done
                    ? "bg-primary text-primary-foreground shadow-[var(--customer-glow)]"
                    : "border border-border bg-card text-muted-foreground",
                  active && "ring-4 ring-primary/20 scale-105"
                )}
                style={
                  active && done
                    ? { backgroundColor: color, color: "#fff" }
                    : undefined
                }
              >
                {index + 1}
              </span>
            </div>
            <span
              className={cn(
                "text-center text-meta leading-tight",
                active ? "font-semibold text-foreground" : "text-muted-foreground"
              )}
            >
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
