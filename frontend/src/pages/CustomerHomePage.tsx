import { Link } from "react-router-dom";
import { paths } from "@/lib/paths";
import { useQuery } from "@tanstack/react-query";
import { CalendarPlus } from "lucide-react";
import { api } from "@/lib/api";
import { PageHeader, StatCard } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { StatGridSkeleton } from "@/components/ui/loading-skeletons";
import { ErrorState } from "@/components/ui/section-states";
import type { PaginatedBookings } from "@/types";
import { StatusBadge } from "@/components/StatusBadge";
import { formatCurrency, formatDate } from "@/lib/utils";

export function CustomerHomePage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["customer-bookings-home"],
    queryFn: () =>
      api.get<PaginatedBookings>(
        "/api/bookings?limit=50&sortBy=scheduledAt&sortOrder=desc"
      ),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="My Bookings" description="Your vehicle service history" />
        <StatGridSkeleton count={2} />
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState title="Failed to load your bookings" onRetry={() => refetch()} />
    );
  }

  const bookings = data?.data ?? [];
  const active = bookings.filter((b) =>
    ["PENDING", "ASSIGNED", "MECHANIC_ON_THE_WAY", "IN_PROGRESS"].includes(b.status)
  );
  const completed = bookings.filter((b) => b.status === "COMPLETED");

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Bookings"
        description="View status and history for your service appointments"
        action={
          <Button asChild size="sm">
            <Link to={paths.bookingsNew}>
              <CalendarPlus className="h-4 w-4" />
              Book a service
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Active bookings" value={String(active.length)} variant="compact" />
        <StatCard label="Completed services" value={String(completed.length)} variant="compact" />
      </div>

      <div className="ops-panel">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-body font-semibold">Recent bookings</h2>
        </div>
        <div className="space-y-0 p-2">
          {bookings.length === 0 ? (
            <div className="space-y-3 text-center">
              <p className="text-sm text-muted-foreground">No bookings yet.</p>
              <Button asChild size="sm" variant="outline">
                <Link to={paths.bookingsNew}>
                  <CalendarPlus className="h-4 w-4" />
                  Book your first service
                </Link>
              </Button>
            </div>
          ) : (
            bookings.slice(0, 10).map((b) => (
              <Link
                key={b.id}
                to={paths.booking(b.id)}
                className="flex items-center justify-between rounded-[8px] border border-border p-3 transition-colors hover:bg-accent"
              >
                <div>
                  <p className="font-medium">{b.serviceCategory.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(b.scheduledAt)} · {formatCurrency(b.amount)}
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
