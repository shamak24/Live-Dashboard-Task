import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Search, Download } from "lucide-react";
import { api } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { PaginatedBookings, Booking } from "@/types";
import { StatusBadge } from "@/components/StatusBadge";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableSkeleton } from "@/components/ui/loading-skeletons";
import { ErrorState, EmptyState, InlineLoader } from "@/components/ui/section-states";
import { useSocket } from "@/contexts/SocketContext";
import { cn } from "@/lib/utils";

const STATUSES = [
  "PENDING",
  "ASSIGNED",
  "MECHANIC_ON_THE_WAY",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
];

export function BookingsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [flashIds, setFlashIds] = useState<Set<string>>(new Set());
  const { socket } = useSocket();

  const queryKey = ["bookings", page, search, status, sortBy, sortOrder];

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey,
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
        sortBy,
        sortOrder,
      });
      if (search) params.set("search", search);
      if (status) params.set("status", status);
      return api.get<PaginatedBookings>(`/api/bookings?${params}`);
    },
  });

  useEffect(() => {
    if (!socket) return;
    const handler = (booking: Booking) => {
      setFlashIds((prev) => new Set(prev).add(booking.id));
      setTimeout(() => {
        setFlashIds((prev) => {
          const next = new Set(prev);
          next.delete(booking.id);
          return next;
        });
      }, 1500);
    };
    socket.on("booking:updated", handler);
    return () => {
      socket.off("booking:updated", handler);
    };
  }, [socket]);

  const exportCsv = () => {
    if (!data?.data.length) return;
    const headers = ["ID", "Customer", "Service", "Status", "Amount", "Scheduled", "Mechanic"];
    const rows = data.data.map((b) => [
      b.id,
      b.customer.user.name,
      b.serviceCategory.name,
      b.status,
      b.amount,
      b.scheduledAt,
      b.mechanic?.user.name ?? "",
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bookings.csv";
    a.click();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bookings"
        description="Search, filter, and monitor all service bookings"
        action={
          <div className="flex items-center gap-3">
            {isFetching && !isLoading && <InlineLoader />}
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={!data?.data.length}>
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        }
      />

      <div className="animate-fade-in-up stagger-1 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9 transition-shadow focus:shadow-sm"
            placeholder="Search by customer or booking ID..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <select
          className="h-9 rounded-md border border-border bg-card px-3 text-sm transition-colors hover:bg-accent/50"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
          ))}
        </select>
        <select
          className="h-9 rounded-md border border-border bg-card px-3 text-sm transition-colors hover:bg-accent/50"
          value={`${sortBy}-${sortOrder}`}
          onChange={(e) => {
            const [sb, so] = e.target.value.split("-");
            setSortBy(sb);
            setSortOrder(so);
          }}
        >
          <option value="createdAt-desc">Newest first</option>
          <option value="createdAt-asc">Oldest first</option>
          <option value="scheduledAt-desc">Scheduled (latest)</option>
          <option value="amount-desc">Amount (high)</option>
          <option value="amount-asc">Amount (low)</option>
        </select>
      </div>

      <section className="animate-fade-in-up stagger-2">
        {isLoading ? (
          <TableSkeleton rows={10} columns={6} />
        ) : isError ? (
          <ErrorState
            title="Failed to load bookings"
            onRetry={() => refetch()}
          />
        ) : data?.data.length === 0 ? (
          <EmptyState
            title="No bookings found"
            description="Try adjusting your search or filter criteria."
          />
        ) : (
          <>
            <div
              className={cn(
                "overflow-hidden rounded-lg border border-border transition-opacity duration-300",
                isFetching && "opacity-70"
              )}
            >
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Customer</th>
                    <th className="px-4 py-3 text-left font-medium">Service</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                    <th className="px-4 py-3 text-left font-medium">Amount</th>
                    <th className="px-4 py-3 text-left font-medium">Scheduled</th>
                    <th className="px-4 py-3 text-left font-medium">Mechanic</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.data ?? []).map((booking, i) => (
                    <tr
                      key={booking.id}
                      className={cn(
                        "border-b border-border transition-colors hover:bg-muted/30 animate-fade-in",
                        flashIds.has(booking.id) && "animate-flash-update"
                      )}
                      style={{ animationDelay: `${Math.min(i * 30, 300)}ms` }}
                    >
                      <td className="px-4 py-3">
                        <Link
                          to={`/bookings/${booking.id}`}
                          className="font-medium text-primary transition-colors hover:underline"
                        >
                          {booking.customer.user.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3">{booking.serviceCategory.name}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={booking.status} />
                      </td>
                      <td className="px-4 py-3 tabular-nums">{formatCurrency(booking.amount)}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDate(booking.scheduledAt)}
                      </td>
                      <td className="px-4 py-3">
                        {booking.mechanic?.user.name ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {data && data.pagination.totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between animate-fade-in">
                <p className="text-sm text-muted-foreground">
                  Page {data.pagination.page} of {data.pagination.totalPages} ({data.pagination.total} total)
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1 || isFetching}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= data.pagination.totalPages || isFetching}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
