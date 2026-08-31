import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Search, Download } from "lucide-react";
import { api } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { PaginatedBookings, Booking } from "@/types";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useSocket } from "@/contexts/SocketContext";

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

  const { data, isLoading, isError, refetch } = useQuery({
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

  // Flash animation on live updates
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Bookings</h1>
          <p className="text-sm text-muted-foreground">
            Search, filter, and monitor all service bookings
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={exportCsv}>
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by customer or booking ID..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <select
          className="h-9 rounded-md border border-border bg-card px-3 text-sm"
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
          className="h-9 rounded-md border border-border bg-card px-3 text-sm"
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

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-lg border border-destructive/50 p-6 text-center">
          <p className="text-destructive">Failed to load bookings</p>
          <button className="mt-2 text-sm text-primary underline" onClick={() => refetch()}>
            Retry
          </button>
        </div>
      ) : data?.data.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground">No bookings match your filters</p>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-lg border border-border">
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
                {(data?.data ?? []).map((booking) => (
                  <tr
                    key={booking.id}
                    className={`border-b border-border transition-colors hover:bg-muted/30 ${
                      flashIds.has(booking.id) ? "animate-flash-update" : ""
                    }`}
                  >
                    <td className="px-4 py-3">
                      <Link
                        to={`/bookings/${booking.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {booking.customer.user.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{booking.serviceCategory.name}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={booking.status} />
                    </td>
                    <td className="px-4 py-3">{formatCurrency(booking.amount)}</td>
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
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {data.pagination.page} of {data.pagination.totalPages} ({data.pagination.total} total)
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= data.pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
