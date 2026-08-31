import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import { paths } from "@/lib/paths";
import { api } from "@/lib/api";
import type { MechanicListItem } from "@/types";
import { StatusBadge } from "@/components/StatusBadge";
import { PageHeader } from "@/components/PageHeader";
import { TableSkeleton } from "@/components/ui/loading-skeletons";
import { ErrorState, InlineLoader, EmptyState } from "@/components/ui/section-states";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { getMechanicFleetBadgeClass, getMechanicFleetLabel } from "@/lib/statusColors";

export function MechanicsPage() {
  const [search, setSearch] = useState("");

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ["mechanics"],
    queryFn: () => api.get<{ data: MechanicListItem[] }>("/api/mechanics"),
    refetchInterval: 30000,
  });

  const filtered = useMemo(() => {
    const rows = data?.data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((m) => m.name.toLowerCase().includes(q));
  }, [data?.data, search]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mechanics"
        description="Fleet status and current assignments"
        action={isFetching && !isLoading ? <InlineLoader /> : undefined}
      />

      <div className="ops-toolbar">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by mechanic name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search mechanics by name"
          />
        </div>
        {search.trim() && (
          <span className="text-meta text-muted-foreground">
            {filtered.length} match{filtered.length !== 1 ? "es" : ""}
          </span>
        )}
      </div>

      <section>
        {isLoading ? (
          <TableSkeleton rows={8} columns={5} />
        ) : isError ? (
          <ErrorState title="Failed to load mechanics" onRetry={() => refetch()} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title={search.trim() ? "No mechanics match your search" : "No mechanics found"}
            description={
              search.trim()
                ? "Try a different name or clear the search."
                : "Mechanic accounts will appear here."
            }
          />
        ) : (
          <>
            <div className="space-y-3 md:hidden">
              {filtered.map((m) => (
                <Link
                  key={m.id}
                  to={paths.mechanic(m.id)}
                  className="ops-booking-card block"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium text-foreground">{m.name}</p>
                    <span
                      className={cn(
                        "inline-flex shrink-0 rounded-[8px] px-2 py-0.5 text-meta font-medium",
                        getMechanicFleetBadgeClass(m.status)
                      )}
                    >
                      {getMechanicFleetLabel(m.status)}
                    </span>
                  </div>
                  <p className="mt-1 text-body text-muted-foreground">
                    {m.specialty ?? "General"} · {m.jobsCompleted} jobs done
                  </p>
                  {m.currentBooking && (
                    <p className="mt-2 text-meta text-muted-foreground">
                      On: {m.currentBooking.customer.user.name}
                    </p>
                  )}
                </Link>
              ))}
            </div>
            <div
            className={cn(
              "hidden md:block ops-panel overflow-hidden",
              isFetching && "opacity-70"
            )}
          >
            <table className="ops-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Status</th>
                  <th className="num">Jobs completed</th>
                  <th>Specialty</th>
                  <th>Current booking</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <Link
                        to={paths.mechanic(m.id)}
                        className="font-medium text-foreground underline-offset-4 hover:underline"
                      >
                        {m.name}
                      </Link>
                    </td>
                    <td>
                      <span
                        className={cn(
                          "inline-flex rounded-[8px] px-2.5 py-0.5 text-meta font-medium",
                          getMechanicFleetBadgeClass(m.status)
                        )}
                      >
                        {getMechanicFleetLabel(m.status)}
                      </span>
                    </td>
                    <td className="num">{m.jobsCompleted}</td>
                    <td className="text-muted-foreground">{m.specialty ?? "—"}</td>
                    <td>
                      {m.currentBooking ? (
                        <div className="flex items-center gap-2">
                          <StatusBadge status={m.currentBooking.status} />
                          <span className="text-muted-foreground">
                            {m.currentBooking.customer.user.name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
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
