import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CalendarPlus } from "lucide-react";
import { api } from "@/lib/api";
import { paths } from "@/lib/paths";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import type { PaginatedBookings, Booking } from "@/types";
import { ACTIVE_BOOKING_STATUSES } from "@/lib/customerNav";
import { getStatusLabel } from "@/lib/statusColors";
import { StatusStepTracker } from "@/components/customer/StatusStepTracker";
import { CustomerLiveMap } from "@/components/customer/CustomerLiveMap";
import { Button } from "@/components/ui/button";
import { useSocket } from "@/contexts/SocketContext";
import { useAuth } from "@/contexts/AuthContext";

function statusHeadline(status: string, serviceName: string): string {
  switch (status) {
    case "PENDING":
      return "We're finding a mechanic for your " + serviceName.toLowerCase();
    case "ASSIGNED":
      return "A mechanic has been assigned";
    case "MECHANIC_ON_THE_WAY":
      return "Your mechanic is on the way";
    case "IN_PROGRESS":
      return "Service is in progress";
    default:
      return "Your service update";
  }
}

export function CustomerPortalHome() {
  const { user } = useAuth();
  const { connected } = useSocket();

  const { data, isLoading } = useQuery({
    queryKey: ["customer-portal-bookings"],
    queryFn: () =>
      api.get<PaginatedBookings>(
        "/api/bookings?limit=20&sortBy=scheduledAt&sortOrder=desc"
      ),
    refetchInterval: 30000,
  });

  const bookings = data?.data ?? [];
  const active = bookings.find((b) =>
    ACTIVE_BOOKING_STATUSES.includes(b.status as typeof ACTIVE_BOOKING_STATUSES[number])
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 rounded-lg skeleton-shimmer" />
        <div className="customer-card h-64 skeleton-shimmer" />
      </div>
    );
  }

  if (!active) {
    return (
      <div className="space-y-6">
        <div>
          <p className="text-body text-muted-foreground">Hi {user?.name?.split(" ")[0] ?? "there"},</p>
          <h1 className="customer-headline mt-1 text-foreground">
            Ready for your next service?
          </h1>
          <p className="customer-body mt-3 text-muted-foreground">
            Book a mobile mechanic to come to you — track everything live from your phone.
          </p>
        </div>

        <div className="customer-card p-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <CalendarPlus className="h-8 w-8" />
          </div>
          <p className="mt-4 text-body font-medium">No active service right now</p>
          <p className="mt-1 text-body text-muted-foreground">
            Oil changes, brakes, diagnostics — we come to your driveway or office.
          </p>
          <Button asChild className="mt-6 w-full sm:w-auto h-11 px-6">
            <Link to={paths.customerBook}>Book your next service</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-meta text-muted-foreground">
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                connected ? "bg-primary animate-pulse-live" : "bg-amber-500"
              )}
            />
            {connected ? "Live updates" : "Reconnecting…"}
          </p>
          <h1 className="customer-headline mt-2 text-foreground">
            {statusHeadline(active.status, active.serviceCategory.name)}
          </h1>
          <p className="mt-2 text-body text-muted-foreground">
            {active.vehicle.year} {active.vehicle.make} {active.vehicle.model} ·{" "}
            {formatDate(active.scheduledAt)}
          </p>
        </div>
      </div>

      <div className="customer-card p-4 md:p-5">
        <StatusStepTracker status={active.status} />
      </div>

      <CustomerLiveMap
        status={active.status}
        mechanicName={active.mechanic?.user.name}
      />

      <ActiveBookingDetails booking={active} />
    </div>
  );
}

function ActiveBookingDetails({ booking }: { booking: Booking }) {
  return (
    <div className="customer-card divide-y divide-border">
      <div className="flex items-center justify-between gap-3 p-4">
        <div>
          <p className="text-meta text-muted-foreground">Service</p>
          <p className="text-body font-medium">{booking.serviceCategory.name}</p>
        </div>
        <p className="font-mono text-body font-semibold tabular-nums">
          {formatCurrency(booking.amount)}
        </p>
      </div>
      <div className="p-4">
        <p className="text-meta text-muted-foreground">Status</p>
        <p className="mt-1 text-body font-medium">{getStatusLabel(booking.status)}</p>
        {booking.mechanic && (
          <p className="mt-2 text-body text-muted-foreground">
            {booking.mechanic.user.name}
            {booking.mechanic.specialty ? ` · ${booking.mechanic.specialty}` : ""}
          </p>
        )}
      </div>
      {booking.preVisitSummary && booking.status !== "PENDING" && (
        <div className="p-4">
          <p className="text-meta text-muted-foreground">What to expect</p>
          <p className="mt-2 text-body leading-relaxed text-muted-foreground">
            {booking.preVisitSummary}
          </p>
        </div>
      )}
      <div className="p-4">
        <Button variant="outline" asChild className="w-full">
          <Link to={paths.booking(booking.id)}>View full details</Link>
        </Button>
      </div>
    </div>
  );
}
