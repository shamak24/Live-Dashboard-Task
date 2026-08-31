import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Booking } from "@/types";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: booking, isLoading, isError, refetch } = useQuery({
    queryKey: ["booking", id],
    queryFn: () => api.get<Booking>(`/api/bookings/${id}`),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (isError || !booking) {
    return (
      <div className="rounded-lg border border-destructive/50 p-6 text-center">
        <p className="text-destructive">Booking not found</p>
        <button className="mt-2 text-sm text-primary underline" onClick={() => refetch()}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
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
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Customer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p className="font-medium">{booking.customer.user.name}</p>
            <p className="text-muted-foreground">{booking.customer.user.email}</p>
            {booking.customer.phone && <p>{booking.customer.phone}</p>}
            {booking.customer.address && (
              <p className="text-muted-foreground">{booking.customer.address}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Vehicle</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p className="font-medium">
              {booking.vehicle.year} {booking.vehicle.make} {booking.vehicle.model}
            </p>
            <p className="text-muted-foreground">Plate: {booking.vehicle.plate}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Service</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p className="font-medium">{booking.serviceCategory.name}</p>
            <p className="text-muted-foreground">{booking.serviceCategory.description}</p>
            <p className="mt-2 font-semibold">{formatCurrency(booking.amount)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Mechanic</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {booking.mechanic ? (
              <>
                <p className="font-medium">{booking.mechanic.user.name}</p>
                <p className="text-muted-foreground">{booking.mechanic.specialty}</p>
              </>
            ) : (
              <p className="text-muted-foreground">Not assigned</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pre-Visit Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {booking.preVisitSummary ?? "No pre-visit summary generated yet."}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Post-Visit Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {booking.postVisitSummary ?? "No post-visit summary generated yet."}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
