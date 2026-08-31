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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

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
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api.get<DashboardStats>("/api/dashboard"),
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
        <p className="text-destructive">Failed to load dashboard stats</p>
        <button
          className="mt-2 text-sm text-primary underline"
          onClick={() => refetch()}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="text-sm text-muted-foreground">
          Live operations snapshot for Instant Mechanic
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statConfig.map(({ key, label, icon: Icon, format }) => (
          <Card key={key}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {label}
              </CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {format(data![key as keyof DashboardStats] as number)}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
