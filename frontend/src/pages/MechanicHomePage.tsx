import { Link } from "react-router-dom";
import { useEffect } from "react";
import { paths } from "@/lib/paths";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { PageHeader, StatCard } from "@/components/PageHeader";
import { MechanicHomeSkeleton } from "@/components/ui/loading-skeletons";
import { ErrorState, EmptyState } from "@/components/ui/section-states";
import type { PaginatedBookings, Booking, MechanicListItem } from "@/types";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useSocket } from "@/contexts/SocketContext";
import { getNextStatuses, getStatusActionLabel } from "@/lib/bookingStatus";
import { getMechanicFleetLabel, getStatusLabel } from "@/lib/statusColors";

const ACTIVE = ["ASSIGNED", "MECHANIC_ON_THE_WAY", "IN_PROGRESS"] as const;
const ACTIVE_PRIORITY: Record<string, number> = {
  IN_PROGRESS: 0,
  MECHANIC_ON_THE_WAY: 1,
  ASSIGNED: 2,
};

function pickCurrentJob(bookings: Booking[]): Booking | null {
  const active = bookings.filter((b) =>
    ACTIVE.includes(b.status as typeof ACTIVE[number])
  );
  if (active.length === 0) return null;
  return active.sort(
    (a, b) => ACTIVE_PRIORITY[a.status] - ACTIVE_PRIORITY[b.status]
  )[0];
}

export function MechanicHomePage() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const queryClient = useQueryClient();

  const bookingsQuery = useQuery({
    queryKey: ["mechanic-bookings-home"],
    queryFn: () =>
      api.get<PaginatedBookings>(
        "/api/bookings?limit=100&sortBy=scheduledAt&sortOrder=desc"
      ),
    refetchInterval: 30000,
  });

  const profileQuery = useQuery({
    queryKey: ["mechanic-profile", user?.email],
    queryFn: async () => {
      const res = await api.get<{ data: MechanicListItem[] }>("/api/mechanics");
      const me = res.data.find((m) => m.email === user?.email);
      return me ?? null;
    },
    enabled: !!user?.email,
  });

  useEffect(() => {
    if (!socket) return;
    const refresh = () => {
      queryClient.invalidateQueries({ queryKey: ["mechanic-bookings-home"] });
      queryClient.invalidateQueries({ queryKey: ["mechanic-profile"] });
    };
    socket.on("booking:updated", refresh);
    return () => {
      socket.off("booking:updated", refresh);
    };
  }, [socket, queryClient]);

  const statusMutation = useMutation({
    mutationFn: (body: { bookingId: string; status: string; version: number }) =>
      api.patch<Booking>(`/api/bookings/${body.bookingId}/status`, {
        status: body.status,
        version: body.version,
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData<PaginatedBookings>(
        ["mechanic-bookings-home"],
        (old) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.map((b) => (b.id === updated.id ? updated : b)),
          };
        }
      );
      queryClient.invalidateQueries({ queryKey: ["mechanic-profile"] });
      toast.success("Status updated");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Couldn't update status. Try again.");
    },
  });

  if (bookingsQuery.isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="My Jobs" description="Your assigned service bookings" />
        <MechanicHomeSkeleton />
      </div>
    );
  }

  if (bookingsQuery.isError) {
    return (
      <ErrorState
        title="Couldn't load your jobs"
        message="Check your connection and try again."
        onRetry={() => bookingsQuery.refetch()}
      />
    );
  }

  const bookings = bookingsQuery.data?.data ?? [];
  const active = bookings.filter((b) =>
    ACTIVE.includes(b.status as typeof ACTIVE[number])
  );
  const currentJob = pickCurrentJob(bookings);
  const otherActive = active.filter((b) => b.id !== currentJob?.id);
  const jobsCompleted = profileQuery.data?.jobsCompleted ?? 0;
  const fleetStatus = profileQuery.data?.status;

  const mechanicNextStatuses = currentJob
    ? getNextStatuses(currentJob.status).filter((s) => s !== "CANCELLED" && s !== "ASSIGNED")
    : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Jobs"
        description="Your current assignment and quick status updates"
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          variant="compact"
          label="Current status"
          value={
            currentJob
              ? getStatusLabel(currentJob.status)
              : fleetStatus
                ? getMechanicFleetLabel(fleetStatus)
                : "Available"
          }
        />
        <StatCard
          variant="compact"
          label="Jobs completed"
          value={jobsCompleted.toLocaleString()}
        />
      </div>

      {currentJob ? (
        <section className="ops-stat-hero p-4 md:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-meta">Active job</p>
              <h2 className="mt-1 text-section font-semibold tracking-tight">
                {currentJob.customer.user.name}
              </h2>
              <p className="mt-1 text-body text-muted-foreground">
                {currentJob.serviceCategory.name} · {formatDate(currentJob.scheduledAt)}
              </p>
              <p className="mt-1 text-body text-muted-foreground">
                {currentJob.vehicle.year} {currentJob.vehicle.make} {currentJob.vehicle.model}
                {currentJob.customer.address ? ` · ${currentJob.customer.address}` : ""}
              </p>
            </div>
            <StatusBadge status={currentJob.status} />
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <span className="font-mono text-body font-semibold tabular-nums">
              {formatCurrency(currentJob.amount)}
            </span>
            <Button variant="outline" size="sm" asChild>
              <Link to={paths.booking(currentJob.id)}>Full details</Link>
            </Button>
          </div>

          {mechanicNextStatuses.length > 0 && (
            <div className="mt-4 space-y-3 border-t border-border pt-4">
              <p className="text-meta font-medium">Update status</p>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                {mechanicNextStatuses.map((status) => (
                  <Button
                    key={status}
                    className="h-11 min-w-[140px] flex-1 sm:flex-none"
                    loading={
                      statusMutation.isPending &&
                      statusMutation.variables?.status === status
                    }
                    loadingText="Updating..."
                    onClick={() =>
                      statusMutation.mutate({
                        bookingId: currentJob.id,
                        status,
                        version: currentJob.version,
                      })
                    }
                  >
                    {getStatusActionLabel(status)}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </section>
      ) : (
        <EmptyState
          title="No active jobs"
          description="When you're assigned a booking, it will appear here with quick status actions."
        />
      )}

      {otherActive.length > 0 && (
        <div className="ops-panel">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-body font-semibold">Other active assignments</h2>
          </div>
          <ul className="divide-y divide-border">
            {otherActive.map((b) => (
              <li key={b.id}>
                <Link
                  to={paths.booking(b.id)}
                  className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-accent"
                >
                  <div className="min-w-0">
                    <p className="text-body font-medium">{b.customer.user.name}</p>
                    <p className="text-meta">
                      {b.serviceCategory.name}, {formatDate(b.scheduledAt)}
                    </p>
                  </div>
                  <StatusBadge status={b.status} />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
