import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { RefreshCw, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import type { Booking, MechanicListItem } from "@/types";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DetailCardsSkeleton,
  PageHeaderSkeleton,
} from "@/components/ui/loading-skeletons";
import { ErrorState, Spinner } from "@/components/ui/section-states";
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
    queryKey: ["mechanics-assign"],
    queryFn: () => api.get<{ data: MechanicListItem[] }>("/api/mechanics"),
    enabled: isAdmin,
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
        <div className="grid gap-4 md:grid-cols-1">
          <Card className="animate-fade-in-up stagger-5">
            <CardHeader><CardTitle className="text-base">Pre-Visit Summary</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <div className="h-4 w-full rounded bg-muted skeleton-shimmer" />
              <div className="h-4 w-4/5 rounded bg-muted skeleton-shimmer" />
            </CardContent>
          </Card>
          <Card className="animate-fade-in-up stagger-6">
            <CardHeader><CardTitle className="text-base">Post-Visit Summary</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <div className="h-4 w-full rounded bg-muted skeleton-shimmer" />
              <div className="h-4 w-3/4 rounded bg-muted skeleton-shimmer" />
            </CardContent>
          </Card>
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

  const infoCards = [
    {
      title: "Customer",
      content: (
        <div className="space-y-1 text-sm">
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
        <div className="text-sm">
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
        <div className="text-sm">
          <p className="font-medium">{booking.serviceCategory.name}</p>
          <p className="text-muted-foreground">{booking.serviceCategory.description}</p>
          <p className="mt-2 font-semibold tabular-nums">{formatCurrency(booking.amount)}</p>
        </div>
      ),
    },
    {
      title: "Mechanic",
      content: booking.mechanic ? (
        <div className="text-sm">
          <p className="font-medium">{booking.mechanic.user.name}</p>
          <p className="text-muted-foreground">{booking.mechanic.specialty}</p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Not assigned</p>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="animate-fade-in-up">
        <h1 className="text-2xl font-semibold tracking-tight">
          Booking #{booking.id.slice(0, 8)}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <StatusBadge status={booking.status} />
          <span className="text-sm text-muted-foreground">
            Scheduled {formatDate(booking.scheduledAt)}
          </span>
        </div>
      </div>

      {canUpdateStatus && nextStatuses.length > 0 && (
        <Card className="animate-fade-in-up stagger-1 border-primary/20">
          <CardHeader>
            <CardTitle className="text-base">Update status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {needsMechanicPick && (
              <select
                className="h-9 w-full max-w-xs rounded-md border border-border bg-card px-3 text-sm"
                value={selectedMechanicId}
                onChange={(e) => setSelectedMechanicId(e.target.value)}
              >
                <option value="">Select mechanic...</option>
                {mechanicsData?.data.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            )}
            <div className="flex flex-wrap gap-2">
              {nextStatuses.map((status) => (
                <Button
                  key={status}
                  size="sm"
                  variant={status === "CANCELLED" ? "outline" : "default"}
                  disabled={statusMutation.isPending}
                  onClick={() => handleStatusUpdate(status)}
                >
                  {statusMutation.isPending ? (
                    <Spinner size="sm" />
                  ) : (
                    <ArrowRight className="h-4 w-4" />
                  )}
                  {formatStatusLabel(status)}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {infoCards.map((card, i) => (
          <Card
            key={card.title}
            className={cn("card-interactive animate-fade-in-up", `stagger-${i + 2}`)}
          >
            <CardHeader>
              <CardTitle className="text-base">{card.title}</CardTitle>
            </CardHeader>
            <CardContent>{card.content}</CardContent>
          </Card>
        ))}
      </div>

      <Card className="card-interactive animate-fade-in-up stagger-5">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Pre-Visit Summary</CardTitle>
          {isAdmin && (
            <Button
              variant="ghost"
              size="sm"
              disabled={retryMutation.isPending}
              onClick={() => retryMutation.mutate("pre")}
            >
              {retryMutation.isPending ? (
                <Spinner size="sm" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Retry
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {booking.preVisitSummary ?? "No pre-visit summary generated yet."}
          </p>
        </CardContent>
      </Card>

      <Card className="card-interactive animate-fade-in-up stagger-6">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Post-Visit Summary</CardTitle>
          {isAdmin && booking.status === "COMPLETED" && (
            <Button
              variant="ghost"
              size="sm"
              disabled={retryMutation.isPending}
              onClick={() => retryMutation.mutate("post")}
            >
              {retryMutation.isPending ? (
                <Spinner size="sm" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Retry
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {booking.postVisitSummary ?? "No post-visit summary generated yet."}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
