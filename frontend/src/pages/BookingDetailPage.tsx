import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Booking, MechanicListItem } from "@/types";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  DetailCardsSkeleton,
  PageHeaderSkeleton,
} from "@/components/ui/loading-skeletons";
import { ErrorState } from "@/components/ui/section-states";
import { useAuth } from "@/contexts/AuthContext";
import { getNextStatuses, formatStatusLabel } from "@/lib/bookingStatus";

export function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedMechanicId, setSelectedMechanicId] = useState("");

  const isAdmin = user?.role === "ADMIN";
  const canUpdateStatus = isAdmin || user?.role === "MECHANIC";

  const { data: booking, isLoading, isError, refetch } = useQuery({
    queryKey: ["booking", id],
    queryFn: () => api.get<Booking>(`/api/bookings/${id}`),
    enabled: !!id,
  });

  const { data: mechanicsData } = useQuery({
    queryKey: ["mechanics-available", id],
    queryFn: () =>
      api.get<{ data: MechanicListItem[] }>("/api/mechanics?available=true"),
    enabled:
      isAdmin &&
      !!booking &&
      booking.status === "PENDING" &&
      !booking.mechanic,
    staleTime: 0,
  });

  const statusMutation = useMutation({
    mutationFn: (body: { status: string; mechanicId?: string; version: number }) =>
      api.patch<Booking>(`/api/bookings/${id}/status`, body),
    onSuccess: (updated) => {
      queryClient.setQueryData(["booking", id], updated);
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      toast.success("Status updated");
      setSelectedMechanicId("");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to update status");
    },
  });

  const retryMutation = useMutation({
    mutationFn: (type: "pre" | "post") =>
      api.post<Booking>(`/api/bookings/${id}/retry-summary`, { type }),
    onSuccess: (updated) => {
      queryClient.setQueryData(["booking", id], updated);
      toast.success("Summary regenerated");
    },
    onError: () => {
      toast.error("Failed to regenerate summary");
    },
  });

  const handleStatusUpdate = (nextStatus: string) => {
    if (!booking) return;

    if (nextStatus === "ASSIGNED" && isAdmin && !booking.mechanic) {
      if (!selectedMechanicId) {
        toast.error("Select a mechanic before assigning");
        return;
      }
      statusMutation.mutate({
        status: nextStatus,
        mechanicId: selectedMechanicId,
        version: booking.version,
      });
      return;
    }

    statusMutation.mutate({
      status: nextStatus,
      version: booking.version,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeaderSkeleton />
        <DetailCardsSkeleton count={4} />
        <div className="space-y-4">
          <div className="ops-panel p-5 space-y-2">
            <div className="h-5 w-40 rounded skeleton-shimmer" />
            <div className="h-4 w-full rounded skeleton-shimmer" />
            <div className="h-4 w-4/5 rounded skeleton-shimmer" />
          </div>
          <div className="ops-panel p-5 space-y-2">
            <div className="h-5 w-40 rounded skeleton-shimmer" />
            <div className="h-4 w-full rounded skeleton-shimmer" />
            <div className="h-4 w-3/4 rounded skeleton-shimmer" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !booking) {
    return (
      <ErrorState
        title="Booking not found"
        message="This booking may have been removed or you don't have access."
        onRetry={() => refetch()}
      />
    );
  }

  const nextStatuses = getNextStatuses(booking.status);
  const needsMechanicPick =
    isAdmin &&
    booking.status === "PENDING" &&
    nextStatuses.includes("ASSIGNED") &&
    !booking.mechanic;

  const availableMechanics = mechanicsData?.data ?? [];

  const infoCards = [
    {
      title: "Customer",
      content: (
        <div className="space-y-1 text-body">
          <p className="font-medium">{booking.customer.user.name}</p>
          <p className="text-muted-foreground">{booking.customer.user.email}</p>
          {booking.customer.phone && <p>{booking.customer.phone}</p>}
          {booking.customer.address && (
            <p className="text-muted-foreground">{booking.customer.address}</p>
          )}
        </div>
      ),
    },
    {
      title: "Vehicle",
      content: (
        <div className="text-body">
          <p className="font-medium">
            {booking.vehicle.year} {booking.vehicle.make} {booking.vehicle.model}
          </p>
          <p className="text-muted-foreground">Plate: {booking.vehicle.plate}</p>
        </div>
      ),
    },
    {
      title: "Service",
      content: (
        <div className="text-body">
          <p className="font-medium">{booking.serviceCategory.name}</p>
          <p className="text-muted-foreground">{booking.serviceCategory.description}</p>
          <p className="mt-2 font-mono font-semibold tabular-nums">
            {formatCurrency(booking.amount)}
          </p>
        </div>
      ),
    },
    {
      title: "Mechanic",
      content: booking.mechanic ? (
        <div className="text-body">
          <p className="font-medium">{booking.mechanic.user.name}</p>
          <p className="text-muted-foreground">{booking.mechanic.specialty}</p>
        </div>
      ) : (
        <p className="text-body text-muted-foreground">Not assigned</p>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-mono text-section font-semibold tabular-nums tracking-tight">
          Booking #{booking.id.slice(0, 8)}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <StatusBadge status={booking.status} />
          <span className="text-body text-muted-foreground">
            Scheduled {formatDate(booking.scheduledAt)}
          </span>
        </div>
      </div>

      {canUpdateStatus && nextStatuses.length > 0 && (
        <div className="ops-panel p-5 space-y-3">
          <h2 className="text-body font-semibold">Update status</h2>
          {needsMechanicPick && (
            <div className="space-y-2">
              <select
                className="h-9 w-full max-w-xs rounded-[8px] border border-border bg-card px-3 text-body"
                value={selectedMechanicId}
                onChange={(e) => setSelectedMechanicId(e.target.value)}
                disabled={availableMechanics.length === 0}
              >
                <option value="">
                  {availableMechanics.length === 0
                    ? "No available mechanics"
                    : "Select mechanic..."}
                </option>
                {availableMechanics.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                    {m.specialty ? ` — ${m.specialty}` : ""}
                  </option>
                ))}
              </select>
              {availableMechanics.length === 0 && (
                <p className="text-body text-muted-foreground">
                  All mechanics are currently on a job or offline. Try again later
                  or complete an active booking first.
                </p>
              )}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {nextStatuses.map((status) => (
              <Button
                key={status}
                size="sm"
                variant={status === "CANCELLED" ? "outline" : "default"}
                loading={statusMutation.isPending}
                loadingText="Updating..."
                onClick={() => handleStatusUpdate(status)}
              >
                {formatStatusLabel(status)}
              </Button>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {infoCards.map((card) => (
          <div key={card.title} className="ops-panel p-5">
            <h3 className="text-body font-semibold">{card.title}</h3>
            <div className="mt-3">{card.content}</div>
          </div>
        ))}
      </div>

      <div className="ops-panel p-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-body font-semibold">Pre-visit summary</h3>
          {isAdmin && (
            <Button
              variant="ghost"
              size="sm"
              loading={retryMutation.isPending}
              loadingText="Regenerating..."
              onClick={() => retryMutation.mutate("pre")}
            >
              <RefreshCw className="h-4 w-4" />
              Retry
            </Button>
          )}
        </div>
        <p className="mt-3 text-body leading-relaxed text-muted-foreground">
          {booking.preVisitSummary ?? "No pre-visit summary generated yet."}
        </p>
      </div>

      <div className="ops-panel p-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-body font-semibold">Post-visit summary</h3>
          {isAdmin && booking.status === "COMPLETED" && (
            <Button
              variant="ghost"
              size="sm"
              loading={retryMutation.isPending}
              loadingText="Regenerating..."
              onClick={() => retryMutation.mutate("post")}
            >
              <RefreshCw className="h-4 w-4" />
              Retry
            </Button>
          )}
        </div>
        <p className="mt-3 text-body leading-relaxed text-muted-foreground">
          {booking.postVisitSummary ?? "No post-visit summary generated yet."}
        </p>
      </div>
    </div>
  );
}
