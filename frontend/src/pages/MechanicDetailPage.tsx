import { useParams, Link } from "react-router-dom";
import { paths } from "@/lib/paths";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Booking } from "@/types";
import { StatusBadge } from "@/components/StatusBadge";
import {
  PageHeaderSkeleton,
  TableSkeleton,
} from "@/components/ui/loading-skeletons";
import { ErrorState, EmptyState } from "@/components/ui/section-states";

interface MechanicDetail {
  id: string;
  name: string;
  email: string;
  status: string;
  jobsCompleted: number;
  specialty?: string | null;
  bookings: Booking[];
}

export function MechanicDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["mechanic", id],
    queryFn: () => api.get<MechanicDetail>(`/api/mechanics/${id}`),
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
        title="Mechanic not found"
        onRetry={() => refetch()}
      />
    );
  }

  const statCards = [
    { label: "Status", value: data.status.replace(/_/g, " ") },
    { label: "Jobs completed", value: String(data.jobsCompleted) },
    { label: "Specialty", value: data.specialty ?? "General" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-section font-semibold tracking-tight">{data.name}</h1>
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

      <section>
        <h2 className="mb-4 text-body font-semibold">Recent bookings</h2>
        {data.bookings.length === 0 ? (
          <EmptyState
            title="No bookings yet"
            description="This mechanic hasn't been assigned any jobs."
          />
        ) : (
          <div className="ops-panel overflow-hidden">
            <table className="ops-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Service</th>
                  <th>Status</th>
                  <th className="num">Amount</th>
                  <th>Scheduled</th>
                </tr>
              </thead>
              <tbody>
                {data.bookings.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <Link
                        to={paths.booking(b.id)}
                        className="font-medium text-foreground underline-offset-4 hover:underline"
                      >
                        {b.customer.user.name}
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
