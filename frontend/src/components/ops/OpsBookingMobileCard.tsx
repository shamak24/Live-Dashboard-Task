import { Link } from "react-router-dom";
import { paths } from "@/lib/paths";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import type { Booking } from "@/types";
import { StatusBadge } from "@/components/StatusBadge";

export function OpsBookingMobileCard({
  booking,
  flash,
  showMechanic = true,
  showBookingId = false,
}: {
  booking: Booking;
  flash?: boolean;
  showMechanic?: boolean;
  showBookingId?: boolean;
}) {
  return (
    <Link
      to={paths.booking(booking.id)}
      className={cn(
        "ops-booking-card space-y-2",
        flash && "animate-flash-update"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="font-medium text-foreground">
          {showBookingId
            ? booking.id.slice(0, 8).toUpperCase()
            : booking.customer.user.name}
        </span>
        <StatusBadge status={booking.status} />
      </div>
      <p className="text-body text-muted-foreground">{booking.serviceCategory.name}</p>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-meta text-muted-foreground">
        <span className="font-mono tabular-nums font-medium text-foreground">
          {formatCurrency(booking.amount)}
        </span>
        <span>{formatDate(booking.scheduledAt)}</span>
        {showMechanic && (
          <span className="truncate">{booking.mechanic?.user.name ?? "No mechanic"}</span>
        )}
      </div>
    </Link>
  );
}
