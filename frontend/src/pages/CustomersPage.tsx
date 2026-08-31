import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import { paths } from "@/lib/paths";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { PageHeader } from "@/components/PageHeader";
import { TableSkeleton } from "@/components/ui/loading-skeletons";
import { ErrorState, EmptyState } from "@/components/ui/section-states";
import { Input } from "@/components/ui/input";

interface CustomerRow {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  createdAt: string;
  vehicleCount: number;
  bookingCount: number;
  totalSpent: number;
}

export function CustomersPage() {
  const [search, setSearch] = useState("");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["customers"],
    queryFn: () => api.get<{ data: CustomerRow[] }>("/api/customers"),
  });

  const filtered = useMemo(() => {
    const rows = data?.data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((c) => c.name.toLowerCase().includes(q));
  }, [data?.data, search]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        description="Customer accounts, vehicles, and lifetime value"
      />

      <div className="ops-toolbar">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by customer name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search customers by name"
          />
        </div>
        {search.trim() && (
          <span className="text-meta text-muted-foreground text-center sm:text-left">
            {filtered.length} match{filtered.length !== 1 ? "es" : ""}
          </span>
        )}
      </div>

      <section>
        {isLoading ? (
          <TableSkeleton rows={10} columns={6} />
        ) : isError ? (
          <ErrorState title="Failed to load customers" onRetry={() => refetch()} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title={search.trim() ? "No customers match your search" : "No customers yet"}
            description={
              search.trim()
                ? "Try a different name or clear the search."
                : "New sign-ups will appear here."
            }
          />
        ) : (
          <>
            <div className="space-y-3 md:hidden">
              {filtered.map((c) => (
                <Link
                  key={c.id}
                  to={paths.customer(c.id)}
                  className="ops-booking-card block"
                >
                  <p className="font-medium text-foreground">{c.name}</p>
                  <p className="mt-1 text-body text-muted-foreground truncate">{c.email}</p>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-meta text-muted-foreground">
                    <span>{c.vehicleCount} vehicles</span>
                    <span>{c.bookingCount} bookings</span>
                    <span className="font-mono tabular-nums font-medium text-foreground">
                      {formatCurrency(c.totalSpent)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>

            <div className="ops-panel overflow-hidden hidden md:block">
              <table className="ops-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th className="num">Vehicles</th>
                    <th className="num">Bookings</th>
                    <th className="num">Total spent</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <Link
                          to={paths.customer(c.id)}
                          className="font-medium text-foreground underline-offset-4 hover:underline"
                        >
                          {c.name}
                        </Link>
                      </td>
                      <td className="text-muted-foreground">{c.email}</td>
                      <td>{c.phone ?? "—"}</td>
                      <td className="num">{c.vehicleCount}</td>
                      <td className="num">{c.bookingCount}</td>
                      <td className="num">{formatCurrency(c.totalSpent)}</td>
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
