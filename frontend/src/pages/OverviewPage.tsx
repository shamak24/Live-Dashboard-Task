import { useQuery } from "@tanstack/react-query";
import {
  Calendar,
  CheckCircle,
  Clock,
  DollarSign,
  Users,
  Wrench,
  XCircle,
  CalendarDays,
} from "lucide-react";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import type { DashboardStats } from "@/types";
import { PageHeader, StatCard } from "@/components/PageHeader";
import { StatGridSkeleton, PageHeaderSkeleton } from "@/components/ui/loading-skeletons";
import { ErrorState, InlineLoader } from "@/components/ui/section-states";

const statConfig = [
  { key: "totalBookings", label: "Total Bookings", icon: Calendar, format: (v: number) => v.toLocaleString() },
  { key: "todayBookings", label: "Today's Bookings", icon: CalendarDays, format: (v: number) => v.toLocaleString() },
  { key: "completed", label: "Completed", icon: CheckCircle, format: (v: number) => v.toLocaleString() },
  { key: "pending", label: "Pending / Active", icon: Clock, format: (v: number) => v.toLocaleString() },
  { key: "cancelled", label: "Cancelled", icon: XCircle, format: (v: number) => v.toLocaleString() },
  { key: "totalRevenue", label: "Total Revenue", icon: DollarSign, format: (v: number) => formatCurrency(v) },
  { key: "activeMechanics", label: "Active Mechanics", icon: Wrench, format: (v: number) => v.toLocaleString() },
  { key: "newCustomers", label: "New Customers (30d)", icon: Users, format: (v: number) => v.toLocaleString() },
] as const;

export function OverviewPage() {
  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api.get<DashboardStats>("/api/dashboard"),
    refetchInterval: 30000,
  });

  return (
    <div className="space-y-6">
      {isLoading ? (
        <>
          <PageHeaderSkeleton />
          <StatGridSkeleton />
        </>
      ) : isError ? (
        <>
          <PageHeader
            title="Overview"
            description="Live operations snapshot for Instant Mechanic"
          />
          <ErrorState
            title="Failed to load dashboard"
            message="We couldn't fetch your stats. Check your connection and try again."
            onRetry={() => refetch()}
          />
        </>
      ) : (
        <>
          <PageHeader
            title="Overview"
            description="Live operations snapshot for Instant Mechanic"
            action={isFetching ? <InlineLoader /> : undefined}
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {statConfig.map(({ key, label, icon, format }, index) => (
              <StatCard
                key={key}
                label={label}
                icon={icon}
                index={index}
                value={format(data![key as keyof DashboardStats] as number)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
