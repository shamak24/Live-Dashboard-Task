import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import type { Booking } from "@/types";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
            <Card key={i} className={cn("animate-fade-in-up", `stagger-${i + 1}`)}>
              <CardHeader className="pb-2">
                <div className="h-4 w-20 rounded skeleton-shimmer" />
              </CardHeader>
              <CardContent>
                <div className="h-7 w-16 rounded skeleton-shimmer" />
              </CardContent>
            </Card>
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
    { label: "Jobs Completed", value: String(data.jobsCompleted) },
    { label: "Specialty", value: data.specialty ?? "General" },
  ];

  return (
    <div className="space-y-6">
      <div className="animate-fade-in-up">
        <h1 className="text-2xl font-semibold tracking-tight">{data.name}</h1>
        <p className="text-sm text-muted-foreground">{data.email}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {statCards.map((stat, i) => (
          <Card
            key={stat.label}
            className={cn("card-interactive animate-fade-in-up", `stagger-${i + 1}`)}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">{stat.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <section className="animate-fade-in-up stagger-4">
        <h2 className="mb-4 text-lg font-semibold">Recent Bookings</h2>
        {data.bookings.length === 0 ? (
          <EmptyState
            title="No bookings yet"
            description="This mechanic hasn't been assigned any jobs."
          />
        ) : (
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Customer</th>
                  <th className="px-4 py-3 text-left font-medium">Service</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Amount</th>
                  <th className="px-4 py-3 text-left font-medium">Scheduled</th>
                </tr>
              </thead>
              <tbody>
                {data.bookings.map((b, i) => (
                  <tr
                    key={b.id}
                    className="border-b border-border transition-colors hover:bg-muted/30 animate-fade-in"
                    style={{ animationDelay: `${Math.min(i * 30, 300)}ms` }}
                  >
                    <td className="px-4 py-3">
                      <Link to={`/bookings/${b.id}`} className="text-primary hover:underline">
                        {b.customer.user.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{b.serviceCategory.name}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={b.status} />
                    </td>
                    <td className="px-4 py-3 tabular-nums">{formatCurrency(b.amount)}</td>
                    <td className="px-4 py-3 text-muted-foreground">
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
