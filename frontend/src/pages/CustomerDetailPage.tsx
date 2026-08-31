import { useParams, Link } from "react-router-dom";
import { paths } from "@/lib/paths";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Booking, Vehicle } from "@/types";
import { StatusBadge } from "@/components/StatusBadge";
import {
  PageHeaderSkeleton,
  TableSkeleton,
} from "@/components/ui/loading-skeletons";
import { ErrorState, EmptyState } from "@/components/ui/section-states";
import { OpsBookingMobileCard } from "@/components/ops/OpsBookingMobileCard";

interface CustomerDetail {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  createdAt: string;
  vehicleCount: number;
  bookingCount: number;
  totalSpent: number;
  vehicles: Vehicle[];
  bookings: Booking[];
}

export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["customer", id],
    queryFn: () => api.get<CustomerDetail>(`/api/customers/${id}`),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeaderSkeleton />
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="ops-panel px-4 py-3 space-y-2">
              <div className="h-3 w-20 rounded skeleton-shimmer" />
              <div className="h-7 w-16 rounded skeleton-shimmer" />
            </div>
          ))}
        </div>
        <div>
          <div className="mb-4 h-6 w-40 rounded skeleton-shimmer" />
          <TableSkeleton rows={6} columns={5} />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <ErrorState
        title="Customer not found"
        onRetry={() => refetch()}
      />
    );
  }

  const statCards = [
    { label: "Vehicles", value: String(data.vehicleCount) },
    { label: "Bookings", value: String(data.bookingCount) },
    { label: "Total spent", value: formatCurrency(data.totalSpent) },
  ];

  return (
    <div className="space-y-6">
      <div>
        <Link
          to={paths.customers}
          className="text-meta text-muted-foreground hover:text-foreground hover:underline"
        >
          Back to customers
        </Link>
        <h1 className="mt-2 text-section font-semibold tracking-tight">{data.name}</h1>
        <p className="text-body text-muted-foreground">{data.email}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {statCards.map((stat) => (
          <div key={stat.label} className="ops-panel px-4 py-3">
            <p className="text-meta">{stat.label}</p>
            <p className="mt-1 font-mono text-section font-semibold tabular-nums">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="ops-panel p-4">
          <h2 className="text-body font-semibold">Contact</h2>
          <dl className="mt-3 space-y-2 text-body">
            <div>
              <dt className="text-meta">Phone</dt>
              <dd>{data.phone ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-meta">Address</dt>
              <dd className="text-muted-foreground">{data.address ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-meta">Member since</dt>
              <dd className="text-muted-foreground">{formatDate(data.createdAt)}</dd>
            </div>
          </dl>
        </div>

        <div className="ops-panel p-4">
          <h2 className="text-body font-semibold">Vehicles</h2>
          {data.vehicles.length === 0 ? (
            <p className="mt-3 text-body text-muted-foreground">No vehicles on file.</p>
          ) : (
            <ul className="mt-3 divide-y divide-border">
              {data.vehicles.map((v) => (
                <li key={v.id} className="py-2 text-body">
                  {v.year} {v.make} {v.model}
                  <span className="ml-2 font-mono text-meta tabular-nums text-muted-foreground">
                    {v.plate}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <section>
        <h2 className="mb-4 text-body font-semibold">Booking history</h2>
        {data.bookings.length === 0 ? (
          <EmptyState
            title="No bookings yet"
            description="This customer hasn't booked any services."
          />
        ) : (
          <>
            <div className="space-y-3 md:hidden">
              {data.bookings.map((b) => (
                <OpsBookingMobileCard key={b.id} booking={b} showBookingId />
              ))}
            </div>
            <div className="ops-panel overflow-hidden hidden md:block">
            <table className="ops-table">
              <thead>
                <tr>
                  <th>Booking</th>
                  <th>Service</th>
                  <th>Status</th>
                  <th className="num">Amount</th>
                  <th>Scheduled</th>
                  <th>Mechanic</th>
                </tr>
              </thead>
              <tbody>
                {data.bookings.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <Link
                        to={paths.booking(b.id)}
                        className="font-mono text-body font-medium tabular-nums text-foreground underline-offset-4 hover:underline"
                      >
                        {b.id.slice(0, 8).toUpperCase()}
                      </Link>
                    </td>
                    <td>{b.serviceCategory.name}</td>
                    <td>
                      <StatusBadge status={b.status} />
                    </td>
                    <td className="num">{formatCurrency(b.amount)}</td>
                    <td className="text-muted-foreground">
                      {formatDate(b.scheduledAt)}
                    </td>
                    <td className="text-muted-foreground">
                      {b.mechanic?.user.name ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </section>
    </div>
  );
}
