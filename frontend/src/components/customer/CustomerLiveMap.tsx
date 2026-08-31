import { cn } from "@/lib/utils";
import { trackingStepIndex } from "@/lib/customerNav";

/** Abstract live map — home pin + mechanic route, position reflects booking status */
export function CustomerLiveMap({
  status,
  mechanicName,
  className,
}: {
  status: string;
  mechanicName?: string | null;
  className?: string;
}) {
  const progress = trackingStepIndex(status);
  // Mechanic pin moves along route: 15% -> 45% -> 75% based on progress
  const mechanicLeft =
    progress <= 0 ? "18%" : progress === 1 ? "38%" : progress === 2 ? "62%" : "78%";
  const mechanicTop =
    progress <= 0 ? "72%" : progress === 1 ? "55%" : progress === 2 ? "38%" : "28%";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[16px] border border-border bg-[color-mix(in_srgb,var(--color-primary)_6%,var(--color-card))] shadow-[var(--customer-card-shadow)]",
        className
      )}
    >
      <svg viewBox="0 0 400 220" className="h-full w-full min-h-[200px]" aria-hidden>
        <defs>
          <pattern id="custGrid" width="28" height="28" patternUnits="userSpaceOnUse">
            <path
              d="M 28 0 L 0 0 0 28"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.5"
              className="text-border"
              opacity="0.4"
            />
          </pattern>
        </defs>
        <rect width="400" height="220" fill="url(#custGrid)" />
        <path
          d="M 80 170 Q 160 120 240 90 T 320 60"
          fill="none"
          stroke="var(--status-assigned)"
          strokeWidth="3"
          strokeDasharray="8 6"
          opacity="0.5"
        />
      </svg>

      {/* Home — your location */}
      <div className="absolute bottom-[22%] left-[14%] flex flex-col items-center gap-1">
        <span
          className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-card bg-primary text-primary-foreground shadow-md"
          aria-hidden
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z" />
          </svg>
        </span>
        <span className="rounded-full bg-card/90 px-2 py-0.5 text-meta font-medium shadow-sm">
          You
        </span>
      </div>

      {/* Mechanic pin */}
      {(progress >= 1 || status !== "PENDING") && (
        <div
          className="absolute flex flex-col items-center gap-1 transition-all duration-700 ease-out"
          style={{ left: mechanicLeft, top: mechanicTop, transform: "translate(-50%, -50%)" }}
        >
          <span
            className="relative flex h-10 w-10 items-center justify-center rounded-full bg-[var(--status-enroute)] text-white shadow-[0_0_0_6px_color-mix(in_srgb,var(--status-enroute)_25%,transparent)]"
            aria-hidden
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
              <path d="M18.92 6.01C18.75 5.74 18.48 5.5 18.22 5.33L15.5 4H8.5L5.78 5.33C5.48 5.5 5.25 5.74 5.08 6.01L3 12v7a1 1 0 001 1h1a1 1 0 001-1v-1h12v1a1 1 0 001 1h1a1 1 0 001-1v-7l-2.08-5.99zM6.5 16a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm11 0a1.5 1.5 0 110-3 1.5 1.5 0 010 3zM5 11l1.5-4.5h12L19 11H5z" />
            </svg>
          </span>
          {mechanicName && (
            <span className="max-w-[100px] truncate rounded-full bg-card/95 px-2 py-0.5 text-meta font-medium shadow-sm">
              {mechanicName.split(" ")[0]}
            </span>
          )}
        </div>
      )}

      {status === "IN_PROGRESS" && (
        <div className="absolute inset-x-0 bottom-3 text-center text-meta font-medium text-[var(--status-progress)]">
          Service in progress at your location
        </div>
      )}
    </div>
  );
}
