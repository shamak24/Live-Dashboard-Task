import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Search, Download, Filter } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import type { PaginatedBookings, Booking, MechanicListItem } from "@/types";
import { StatusBadge } from "@/components/StatusBadge";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableSkeleton } from "@/components/ui/loading-skeletons";
import { ErrorState, EmptyState, InlineLoader } from "@/components/ui/section-states";
import { useSocket } from "@/contexts/SocketContext";
import { useAuth } from "@/contexts/AuthContext";

const STATUSES = [
  "PENDING",
  "ASSIGNED",
  "MECHANIC_ON_THE_WAY",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
];

interface ServiceCategory {
  id: string;
  name: string;
}

function buildBookingParams(
  page: number,
  limit: number,
  filters: {
    search: string;
    status: string;
    sortBy: string;
    sortOrder: string;
    startDate: string;
    endDate: string;
    mechanicId: string;
    serviceCategoryId: string;
  }
) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
  });
  if (filters.search) params.set("search", filters.search);
  if (filters.status) params.set("status", filters.status);
  if (filters.startDate) params.set("startDate", filters.startDate);
  if (filters.endDate) params.set("endDate", filters.endDate);
  if (filters.mechanicId) params.set("mechanicId", filters.mechanicId);
  if (filters.serviceCategoryId) params.set("serviceCategoryId", filters.serviceCategoryId);
  return params;
}

export function BookingsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [mechanicId, setMechanicId] = useState("");
  const [serviceCategoryId, setServiceCategoryId] = useState("");
  const [flashIds, setFlashIds] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);
  const { socket } = useSocket();

  const filters = {
    search,
    status,
    sortBy,
    sortOrder,
    startDate,
    endDate,
    mechanicId,
    serviceCategoryId,
  };

  const queryKey = ["bookings", page, filters];

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey,
    queryFn: () =>
      api.get<PaginatedBookings>(
        `/api/bookings?${buildBookingParams(page, 20, filters)}`
      ),
  });

  const { data: mechanicsData } = useQuery({
    queryKey: ["mechanics-filter"],
    queryFn: () => api.get<{ data: MechanicListItem[] }>("/api/mechanics"),
    enabled: isAdmin,
  });

  const { data: categoriesData } = useQuery({
    queryKey: ["service-categories"],
    queryFn: () => api.get<{ data: ServiceCategory[] }>("/api/service-categories"),
    enabled: isAdmin,
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

  const resetPage = () => setPage(1);

  const clearFilters = () => {
    setSearch("");
    setStatus("");
    setStartDate("");
    setEndDate("");
    setMechanicId("");
    setServiceCategoryId("");
    setPage(1);
  };

  const hasFilters =
    search || status || startDate || endDate || mechanicId || serviceCategoryId;

  const escapeCsvCell = (value: string | number) => {
    const str = String(value);
    if (/[",\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      const allBookings: Booking[] = [];
      let exportPage = 1;
      let totalPages = 1;

      while (exportPage <= totalPages) {
        const result = await api.get<PaginatedBookings>(
          `/api/bookings?${buildBookingParams(exportPage, 500, filters)}`
        );
        allBookings.push(...result.data);
        totalPages = result.pagination.totalPages;
        exportPage++;
      }

      if (allBookings.length === 0) {
        toast.error("No bookings to export");
        return;
      }

      const headers = [
        "ID",
        "Customer",
        "Service",
        "Status",
        "Amount",
        "Scheduled",
        "Mechanic",
      ];
      const rows = allBookings.map((b) => [
        b.id,
        b.customer.user.name,
        b.serviceCategory.name,
        b.status,
        b.amount,
        b.scheduledAt,
        b.mechanic?.user.name ?? "",
      ]);

      const csv = [headers, ...rows]
        .map((row) => row.map(escapeCsvCell).join(","))
        .join("\n");

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bookings-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${allBookings.length} bookings`);
    } catch {
      toast.error("Failed to export bookings");
    } finally {
      setExporting(false);
    }
  };

  const pageTitle = isAdmin ? "Bookings" : user?.role === "MECHANIC" ? "All Assignments" : "Booking History";
  const pageDescription = isAdmin
    ? "Search, filter, and monitor all service bookings"
    : user?.role === "MECHANIC"
      ? "Your assigned and historical service jobs"
      : "View your service appointment history";

  return (
    <div className="space-y-6">
      <PageHeader
        title={pageTitle}
        description={pageDescription}
        action={
          <div className="flex items-center gap-3">
            {isFetching && !isLoading && <InlineLoader />}
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportCsv()}
                disabled={exporting || (isLoading && !data)}
              >
                <Download className="h-4 w-4" />
                {exporting ? "Exporting..." : "Export CSV"}
              </Button>
            )}
          </div>
        }
      />

      <div className="animate-fade-in-up stagger-1 space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9 transition-shadow focus:shadow-sm"
              placeholder="Search by customer or booking ID..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                resetPage();
              }}
            />
          </div>
          <select
            className="h-9 rounded-md border border-border bg-card px-3 text-sm transition-colors hover:bg-accent/50"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              resetPage();
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

        {isAdmin && (
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Filter className="h-4 w-4" />
              <span>Filters</span>
            </div>
            <Input
              type="date"
              className="h-9 w-auto"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                resetPage();
              }}
              aria-label="Start date"
            />
            <Input
              type="date"
              className="h-9 w-auto"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                resetPage();
              }}
              aria-label="End date"
            />
            <select
              className="h-9 rounded-md border border-border bg-card px-3 text-sm transition-colors hover:bg-accent/50"
              value={mechanicId}
              onChange={(e) => {
                setMechanicId(e.target.value);
                resetPage();
              }}
            >
              <option value="">All mechanics</option>
              {mechanicsData?.data.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
            <select
              className="h-9 rounded-md border border-border bg-card px-3 text-sm transition-colors hover:bg-accent/50"
              value={serviceCategoryId}
              onChange={(e) => {
                setServiceCategoryId(e.target.value);
                resetPage();
              }}
            >
              <option value="">All services</option>
              {categoriesData?.data.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear filters
              </Button>
            )}
          </div>
        )}
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
