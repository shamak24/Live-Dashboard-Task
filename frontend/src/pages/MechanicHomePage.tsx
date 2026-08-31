import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Wrench, Clock, CheckCircle, Calendar } from "lucide-react";
import { api } from "@/lib/api";
import { PageHeader, StatCard } from "@/components/PageHeader";
import { StatGridSkeleton } from "@/components/ui/loading-skeletons";
import { ErrorState } from "@/components/ui/section-states";
import type { PaginatedBookings } from "@/types";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
        <StatCard label="Active now" value={String(active.length)} icon={Wrench} index={0} />
        <StatCard label="Upcoming" value={String(upcoming.length)} icon={Clock} index={1} />
        <StatCard label="Completed" value={String(completed.length)} icon={CheckCircle} index={2} />
      </div>

      <Card className="animate-fade-in-up stagger-4">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Active & upcoming assignments
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {active.length === 0 && upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active jobs right now.</p>
          ) : (
            [...active, ...upcoming].slice(0, 8).map((b) => (
              <Link
                key={b.id}
                to={`/bookings/${b.id}`}
                className="flex items-center justify-between rounded-md border border-border p-3 transition-colors hover:bg-muted/40"
              >
                <div>
                  <p className="font-medium">{b.customer.user.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {b.serviceCategory.name} · {formatDate(b.scheduledAt)}
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
