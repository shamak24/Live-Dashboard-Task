import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Clock } from "lucide-react";
import { api } from "@/lib/api";
import { PageHeader, StatCard } from "@/components/PageHeader";
import { StatGridSkeleton } from "@/components/ui/loading-skeletons";
import { ErrorState } from "@/components/ui/section-states";
import type { PaginatedBookings } from "@/types";
import { StatusBadge } from "@/components/StatusBadge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Active bookings" value={String(active.length)} icon={Clock} index={0} />
        <StatCard label="Completed services" value={String(completed.length)} icon={Calendar} index={1} />
      </div>

      <Card className="animate-fade-in-up stagger-3">
        <CardHeader>
          <CardTitle className="text-base">Recent bookings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {bookings.length === 0 ? (
            <p className="text-sm text-muted-foreground">No bookings yet.</p>
          ) : (
            bookings.slice(0, 10).map((b) => (
              <Link
                key={b.id}
                to={`/bookings/${b.id}`}
                className="flex items-center justify-between rounded-md border border-border p-3 transition-colors hover:bg-muted/40"
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
        </CardContent>
      </Card>
    </div>
  );
}
