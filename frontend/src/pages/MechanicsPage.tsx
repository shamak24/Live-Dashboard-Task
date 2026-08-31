import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { paths } from "@/lib/paths";
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

      <section>
        {isLoading ? (
          <TableSkeleton rows={8} columns={5} />
        ) : isError ? (
          <ErrorState title="Failed to load mechanics" onRetry={() => refetch()} />
        ) : (
          <div
            className={cn(
              "ops-panel overflow-hidden",
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
                {data?.data.map((m) => (
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
                          MECHANIC_STATUS_COLORS[m.status] ?? ""
                        )}
                      >
                        {m.status.replace(/_/g, " ")}
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
        )}
      </section>
    </div>
  );
}
