import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { DashboardStats, ActivityLog } from "@/types";
import { PageHeader, StatCard } from "@/components/PageHeader";
import { PageHeaderSkeleton, OverviewStatsSkeleton } from "@/components/ui/loading-skeletons";
import { ErrorState, InlineLoader, EmptyState } from "@/components/ui/section-states";
import { useSocket } from "@/contexts/SocketContext";

function ActivityLogPanel({
  logs,
  isLoading,
  isError,
  onRetry,
}: {
  logs?: ActivityLog[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}) {
  return (
    <section className="ops-panel">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-body font-semibold">Recent activity</h2>
        <p className="text-meta">Latest booking and account changes (up to 10)</p>
      </div>
      <div className="p-2">
        {isLoading ? (
          <div className="space-y-2 px-2 py-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-10 rounded-[8px] skeleton-shimmer" />
            ))}
          </div>
        ) : isError ? (
          <div className="p-4">
            <ErrorState
              title="Activity log failed to load"
              onRetry={onRetry}
            />
          </div>
        ) : !logs?.length ? (
          <EmptyState
            title="No activity yet"
            description="Booking updates and new sign-ups will appear here."
          />
        ) : (
          <ul className="divide-y divide-border">
            {logs.map((log) => (
              <li
                key={log.id}
                className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4 px-3 py-3"
              >
                <p className="text-body text-foreground min-w-0">{log.message}</p>
                <time
                  className="shrink-0 text-meta tabular-nums text-muted-foreground"
                  dateTime={log.createdAt}
                >
                  {formatDate(log.createdAt)}
                </time>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

export function OverviewPage() {
  const queryClient = useQueryClient();
  const { socket } = useSocket();

  const {
    data,
    isLoading,
    isError,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api.get<DashboardStats>("/api/dashboard"),
    refetchInterval: 30000,
    retry: false,
  });

  useEffect(() => {
    if (!socket) return;
    const refreshActivity = () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard", "activity-logs"] });
    };
    socket.on("booking:updated", refreshActivity);
    return () => {
      socket.off("booking:updated", refreshActivity);
    };
  }, [socket, queryClient]);

  const activityQuery = useQuery({
    queryKey: ["dashboard", "activity-logs"],
    queryFn: () =>
      api.get<{ data: ActivityLog[] }>("/api/dashboard/activity-logs?limit=10"),
    refetchInterval: 30000,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="space-y-6 md:space-y-8">
        <PageHeaderSkeleton />
        <OverviewStatsSkeleton />
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
    <div className="space-y-6 md:space-y-8">
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard variant="compact" label="Total bookings" value={stats.totalBookings.toLocaleString()} />
        <StatCard variant="compact" label="Pending / active" value={stats.pending.toLocaleString()} />
        <StatCard variant="compact" label="Completed" value={stats.completed.toLocaleString()} />
        <StatCard variant="compact" label="Cancelled" value={stats.cancelled.toLocaleString()} />
        <StatCard variant="compact" label="Mechanics on jobs" value={stats.activeMechanics.toLocaleString()} />
        <StatCard variant="compact" label="New customers (30d)" value={stats.newCustomers.toLocaleString()} />
      </div>

      <ActivityLogPanel
        logs={activityQuery.data?.data}
        isLoading={activityQuery.isLoading}
        isError={activityQuery.isError}
        onRetry={() => activityQuery.refetch()}
      />
    </div>
  );
}
