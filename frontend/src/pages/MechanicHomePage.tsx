import { Link } from "react-router-dom";
import { paths } from "@/lib/paths";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader, StatCard } from "@/components/PageHeader";
import { StatGridSkeleton } from "@/components/ui/loading-skeletons";
import { ErrorState } from "@/components/ui/section-states";
import type { PaginatedBookings } from "@/types";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate } from "@/lib/utils";

const ACTIVE = ["ASSIGNED", "MECHANIC_ON_THE_WAY", "IN_PROGRESS"];

export function MechanicHomePage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["mechanic-bookings-home"],
    queryFn: () =>
      api.get<PaginatedBookings>(
        "/api/bookings?limit=100&sortBy=scheduledAt&sortOrder=desc"
      ),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="My Jobs" description="Your assigned service bookings" />
        <StatGridSkeleton count={3} />
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState title="Failed to load your jobs" onRetry={() => refetch()} />
    );
  }

  const bookings = data?.data ?? [];
  const active = bookings.filter((b) => ACTIVE.includes(b.status));
  const completed = bookings.filter((b) => b.status === "COMPLETED");
  const upcoming = bookings.filter(
    (b) => b.status === "PENDING" || b.status === "ASSIGNED"
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Jobs"
        description="Track active assignments and upcoming visits"
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Active now" value={String(active.length)} variant="compact" />
        <StatCard label="Upcoming" value={String(upcoming.length)} variant="compact" />
        <StatCard label="Completed" value={String(completed.length)} variant="compact" />
      </div>

      <div className="ops-panel">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-body font-semibold">Active and upcoming assignments</h2>
        </div>
        <div className="space-y-0 p-2">
          {active.length === 0 && upcoming.length === 0 ? (
            <p className="px-3 py-4 text-body text-muted-foreground">
              No active jobs right now.
            </p>
          ) : (
            [...active, ...upcoming].slice(0, 8).map((b) => (
              <Link
                key={b.id}
                to={paths.booking(b.id)}
                className="flex items-center justify-between rounded-[8px] border border-border p-3 transition-colors hover:bg-accent"
              >
                <div>
                  <p className="text-body font-medium">{b.customer.user.name}</p>
                  <p className="text-meta">
                    {b.serviceCategory.name}, {formatDate(b.scheduledAt)}
                  </p>
                </div>
                <StatusBadge status={b.status} />
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
