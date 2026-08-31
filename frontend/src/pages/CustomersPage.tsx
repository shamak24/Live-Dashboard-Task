import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { PageHeader } from "@/components/PageHeader";
import { TableSkeleton } from "@/components/ui/loading-skeletons";
import { ErrorState } from "@/components/ui/section-states";

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
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["customers"],
    queryFn: () => api.get<{ data: CustomerRow[] }>("/api/customers"),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        description="Customer accounts, vehicles, and lifetime value"
      />

      <section className="animate-fade-in-up">
        {isLoading ? (
          <TableSkeleton rows={10} columns={6} />
        ) : isError ? (
          <ErrorState title="Failed to load customers" onRetry={() => refetch()} />
        ) : (
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Name</th>
                  <th className="px-4 py-3 text-left font-medium">Email</th>
                  <th className="px-4 py-3 text-left font-medium">Phone</th>
                  <th className="px-4 py-3 text-left font-medium">Vehicles</th>
                  <th className="px-4 py-3 text-left font-medium">Bookings</th>
                  <th className="px-4 py-3 text-left font-medium">Total spent</th>
                </tr>
              </thead>
              <tbody>
                {data?.data.map((c, i) => (
                  <tr
                    key={c.id}
                    className="border-b border-border hover:bg-muted/30 animate-fade-in"
                    style={{ animationDelay: `${Math.min(i * 30, 300)}ms` }}
                  >
                    <td className="px-4 py-3 font-medium">{c.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.email}</td>
                    <td className="px-4 py-3">{c.phone ?? "—"}</td>
                    <td className="px-4 py-3 tabular-nums">{c.vehicleCount}</td>
                    <td className="px-4 py-3 tabular-nums">{c.bookingCount}</td>
                    <td className="px-4 py-3 tabular-nums">{formatCurrency(c.totalSpent)}</td>
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
