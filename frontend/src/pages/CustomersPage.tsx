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

      <section>
        {isLoading ? (
          <TableSkeleton rows={10} columns={6} />
        ) : isError ? (
          <ErrorState title="Failed to load customers" onRetry={() => refetch()} />
        ) : (
          <div className="ops-panel overflow-hidden">
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
                {data?.data.map((c) => (
                  <tr key={c.id}>
                    <td className="font-medium">{c.name}</td>
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
        )}
      </section>
    </div>
  );
}
