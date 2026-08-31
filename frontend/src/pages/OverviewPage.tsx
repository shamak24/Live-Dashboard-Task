import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import type { DashboardStats } from "@/types";
import { PageHeader, StatCard } from "@/components/PageHeader";
import { StatGridSkeleton, PageHeaderSkeleton } from "@/components/ui/loading-skeletons";
import { ErrorState, InlineLoader } from "@/components/ui/section-states";

export function OverviewPage() {
  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api.get<DashboardStats>("/api/dashboard"),
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="space-y-8">
        <PageHeaderSkeleton />
        <StatGridSkeleton />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <PageHeader title="Overview" description="Live operations snapshot" />
        <ErrorState
          title="Dashboard stats failed to load"
          message="Check your connection and try again."
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  const stats = data!;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Overview"
        description="Bookings, revenue, and fleet status at a glance"
        action={isFetching ? <InlineLoader /> : undefined}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <StatCard
          variant="hero"
          label="Today's bookings"
          value={stats.todayBookings.toLocaleString()}
        />
        <StatCard
          variant="hero"
          label="Total revenue (completed)"
          value={formatCurrency(stats.totalRevenue)}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard variant="compact" label="Total bookings" value={stats.totalBookings.toLocaleString()} />
        <StatCard variant="compact" label="Pending / active" value={stats.pending.toLocaleString()} />
        <StatCard variant="compact" label="Completed" value={stats.completed.toLocaleString()} />
        <StatCard variant="compact" label="Cancelled" value={stats.cancelled.toLocaleString()} />
        <StatCard variant="compact" label="Mechanics on jobs" value={stats.activeMechanics.toLocaleString()} />
        <StatCard variant="compact" label="New customers (30d)" value={stats.newCustomers.toLocaleString()} />
      </div>
    </div>
  );
}
