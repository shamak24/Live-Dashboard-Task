import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Booking } from "@/types";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DetailCardsSkeleton,
  PageHeaderSkeleton,
} from "@/components/ui/loading-skeletons";
import { ErrorState } from "@/components/ui/section-states";
import { cn } from "@/lib/utils";

export function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: booking, isLoading, isError, refetch } = useQuery({
    queryKey: ["booking", id],
    queryFn: () => api.get<Booking>(`/api/bookings/${id}`),
    enabled: !!id,
  });

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
        <div className="mt-2 flex items-center gap-2">
          <StatusBadge status={booking.status} />
          <span className="text-sm text-muted-foreground">
            Scheduled {formatDate(booking.scheduledAt)}
          </span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {infoCards.map((card, i) => (
          <Card
            key={card.title}
            className={cn("card-interactive animate-fade-in-up", `stagger-${i + 1}`)}
          >
            <CardHeader>
              <CardTitle className="text-base">{card.title}</CardTitle>
            </CardHeader>
            <CardContent>{card.content}</CardContent>
          </Card>
        ))}
      </div>

      <Card className="card-interactive animate-fade-in-up stagger-5">
        <CardHeader>
          <CardTitle className="text-base">Pre-Visit Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {booking.preVisitSummary ?? "No pre-visit summary generated yet."}
          </p>
        </CardContent>
      </Card>

      <Card className="card-interactive animate-fade-in-up stagger-6">
        <CardHeader>
          <CardTitle className="text-base">Post-Visit Summary</CardTitle>
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
