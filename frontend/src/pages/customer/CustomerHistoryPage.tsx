import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { RotateCcw } from "lucide-react";
import { api } from "@/lib/api";
import { paths } from "@/lib/paths";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { PaginatedBookings } from "@/types";
import { getStatusBadgeClass, getStatusLabel } from "@/lib/statusColors";
import { Button } from "@/components/ui/button";
import { ErrorState, EmptyState } from "@/components/ui/section-states";
import { cn } from "@/lib/utils";

export function CustomerHistoryPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["customer-portal-bookings"],
    queryFn: () =>
      api.get<PaginatedBookings>(
        "/api/bookings?limit=50&sortBy=scheduledAt&sortOrder=desc"
      ),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-40 skeleton-shimmer rounded-lg" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="customer-card h-32 skeleton-shimmer" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        title="Couldn't load your history"
        message="Your past services will show up here once loaded."
        onRetry={() => refetch()}
      />
    );
  }

  const bookings = data?.data ?? [];
  const past = bookings.filter(
    (b) => b.status === "COMPLETED" || b.status === "CANCELLED"
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="customer-headline">Service history</h1>
        <p className="mt-2 text-body text-muted-foreground">
          Past visits and what your mechanic noted after each job.
        </p>
      </div>

      {past.length === 0 ? (
        <EmptyState
          title="No completed services yet"
          description="After your first visit, summaries and receipts will appear here."
        />
      ) : (
        <ul className="space-y-4">
          {past.map((b) => (
            <li key={b.id} className="customer-card overflow-hidden">
              <div className="flex items-start justify-between gap-3 border-b border-border p-4">
                <div>
                  <p className="text-body font-semibold">{b.serviceCategory.name}</p>
                  <p className="mt-1 text-body text-muted-foreground">
                    {b.vehicle.year} {b.vehicle.make} {b.vehicle.model}
                  </p>
                  <p className="mt-1 text-meta text-muted-foreground">
                    {formatDate(b.scheduledAt)}
                  </p>
                </div>
                <div className="text-right">
                  <span
                    className={cn(
                      "inline-flex rounded-[8px] px-2.5 py-0.5 text-meta font-medium",
                      getStatusBadgeClass(b.status)
                    )}
                  >
                    {getStatusLabel(b.status)}
                  </span>
                  <p className="mt-2 font-mono text-body font-semibold tabular-nums">
                    {formatCurrency(b.amount)}
                  </p>
                </div>
              </div>

              {b.status === "COMPLETED" && b.postVisitSummary && (
                <div className="bg-muted/30 p-4">
                  <p className="text-meta font-medium text-muted-foreground">
                    After your visit
                  </p>
                  <p className="mt-2 text-body leading-relaxed text-foreground">
                    {b.postVisitSummary}
                  </p>
                </div>
              )}

              <div className="flex gap-2 p-4">
                <Button variant="outline" size="sm" asChild className="flex-1">
                  <Link to={paths.booking(b.id)}>Details</Link>
                </Button>
                {b.status === "COMPLETED" && (
                  <Button size="sm" asChild className="flex-1">
                    <Link
                      to={`${paths.customerBook}?vehicle=${b.vehicle.id}&service=${b.serviceCategory.id}`}
                    >
                      <RotateCcw className="h-4 w-4" />
                      Book again
                    </Link>
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
