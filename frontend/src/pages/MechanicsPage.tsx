import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import type { MechanicListItem } from "@/types";
import { StatusBadge } from "@/components/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";

const MECHANIC_STATUS_COLORS: Record<string, string> = {
  AVAILABLE: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  ON_JOB: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  OFFLINE: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
};

export function MechanicsPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["mechanics"],
    queryFn: () => api.get<{ data: MechanicListItem[] }>("/api/mechanics"),
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-destructive/50 p-6 text-center">
        <p className="text-destructive">Failed to load mechanics</p>
        <button className="mt-2 text-sm text-primary underline" onClick={() => refetch()}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Mechanics</h1>
        <p className="text-sm text-muted-foreground">
          Fleet status and current assignments
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
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
            {data?.data.map((m) => (
              <tr key={m.id} className="border-b border-border hover:bg-muted/30">
                <td className="px-4 py-3">
                  <Link
                    to={`/mechanics/${m.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {m.name}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      MECHANIC_STATUS_COLORS[m.status] ?? ""
                    }`}
                  >
                    {m.status.replace(/_/g, " ")}
                  </span>
                </td>
                <td className="px-4 py-3">{m.jobsCompleted}</td>
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
    </div>
  );
}
