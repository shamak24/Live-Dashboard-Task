import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import type { MechanicListItem } from "@/types";
import { StatusBadge } from "@/components/StatusBadge";
import { PageHeader } from "@/components/PageHeader";
import { TableSkeleton } from "@/components/ui/loading-skeletons";
import { ErrorState, InlineLoader } from "@/components/ui/section-states";
import { cn } from "@/lib/utils";

const MECHANIC_STATUS_COLORS: Record<string, string> = {
  AVAILABLE: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  ON_JOB: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  OFFLINE: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
};

export function MechanicsPage() {
  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ["mechanics"],
    queryFn: () => api.get<{ data: MechanicListItem[] }>("/api/mechanics"),
    refetchInterval: 30000,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mechanics"
        description="Fleet status and current assignments"
        action={isFetching && !isLoading ? <InlineLoader /> : undefined}
      />

      <section className="animate-fade-in-up stagger-1">
        {isLoading ? (
          <TableSkeleton rows={8} columns={5} />
        ) : isError ? (
          <ErrorState title="Failed to load mechanics" onRetry={() => refetch()} />
        ) : (
          <div
            className={cn(
              "overflow-hidden rounded-lg border border-border transition-opacity duration-300",
              isFetching && "opacity-70"
            )}
          >
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Name</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Jobs Completed</th>
                  <th className="px-4 py-3 text-left font-medium">Specialty</th>
                  <th className="px-4 py-3 text-left font-medium">Current Booking</th>
                </tr>
              </thead>
              <tbody>
                {data?.data.map((m, i) => (
                  <tr
                    key={m.id}
                    className="border-b border-border transition-colors hover:bg-muted/30 animate-fade-in"
                    style={{ animationDelay: `${Math.min(i * 40, 400)}ms` }}
                  >
                    <td className="px-4 py-3">
                      <Link
                        to={`/mechanics/${m.id}`}
                        className="font-medium text-primary transition-colors hover:underline"
                      >
                        {m.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
                          MECHANIC_STATUS_COLORS[m.status] ?? ""
                        )}
                      >
                        {m.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 tabular-nums">{m.jobsCompleted}</td>
                    <td className="px-4 py-3 text-muted-foreground">{m.specialty ?? "—"}</td>
                    <td className="px-4 py-3">
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
        )}
      </section>
    </div>
  );
}
