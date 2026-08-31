import { useQuery } from "@tanstack/react-query";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { api, ApiError } from "@/lib/api";
import type { BreakdownItem } from "@/types";
import { getStatusColor } from "@/components/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartSkeleton } from "@/components/ui/loading-skeletons";
import { ErrorState, EmptyState } from "@/components/ui/section-states";
import { PageHeader } from "@/components/PageHeader";
import { formatCurrency, cn } from "@/lib/utils";

interface AnalyticsSummary {
  bookingsOverTime: { date: string; count: number }[];
  revenueOverTime: { date: string; revenue: number }[];
  statusBreakdown: BreakdownItem[];
  categoryBreakdown: BreakdownItem[];
}

function ChartContainer({ children }: { children: React.ReactElement }) {
  return (
    <div className="h-[280px] w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}

function ChartSection({
  title,
  isLoading,
  isError,
  errorMessage,
  isEmpty,
  emptyMessage,
  onRetry,
  index,
  children,
}: {
  title: string;
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  isEmpty?: boolean;
  emptyMessage?: string;
  onRetry?: () => void;
  index: number;
  children: React.ReactNode;
}) {
  if (isLoading) {
    return <ChartSkeleton className={cn(`stagger-${Math.min(index + 1, 4)}`)} />;
  }

  if (isError) {
    return (
      <Card className={cn("animate-fade-in-up", `stagger-${Math.min(index + 1, 4)}`)}>
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <ErrorState
            title="Chart failed to load"
            message={errorMessage}
            onRetry={onRetry}
          />
        </CardContent>
      </Card>
    );
  }

  if (isEmpty) {
    return (
      <Card className={cn("card-interactive animate-fade-in-up", `stagger-${Math.min(index + 1, 4)}`)}>
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState title={emptyMessage ?? "No data for this period"} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("card-interactive animate-fade-in-up", `stagger-${Math.min(index + 1, 4)}`)}>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="animate-fade-in">{children}</CardContent>
    </Card>
  );
}

function formatTooltipCurrency(value: unknown) {
  const num = typeof value === "number" ? value : Number(value);
  return formatCurrency(Number.isFinite(num) ? num : 0);
}

export function AnalyticsPage() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["analytics", "summary"],
    queryFn: () => api.get<AnalyticsSummary>("/api/dashboard/charts/summary"),
    retry: 3,
    staleTime: 60000,
  });

  const errorMessage =
    error instanceof ApiError
      ? error.message
      : error instanceof Error
        ? error.message
        : undefined;

  const statusData =
    data?.statusBreakdown.map((d) => ({
      name: d.status?.replace(/_/g, " ") ?? "Unknown",
      value: d.count,
      color: getStatusColor(d.status ?? ""),
    })) ?? [];

  const categoryData = data?.categoryBreakdown ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="Booking trends and revenue over the last 6 months"
      />

      {isError && !isLoading ? (
        <ErrorState
          title="Failed to load analytics"
          message={errorMessage}
          onRetry={() => refetch()}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <ChartSection
            title="Bookings Over Time"
            index={0}
            isLoading={isLoading}
            isError={false}
            isEmpty={!isLoading && data?.bookingsOverTime.length === 0}
            emptyMessage="No bookings in this date range"
          >
            <ChartContainer>
              <LineChart data={data?.bookingsOverTime ?? []}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                  animationDuration={800}
                />
              </LineChart>
            </ChartContainer>
          </ChartSection>

          <ChartSection
            title="Revenue Over Time"
            index={1}
            isLoading={isLoading}
            isError={false}
            isEmpty={!isLoading && data?.revenueOverTime.length === 0}
            emptyMessage="No completed bookings in this date range"
          >
            <ChartContainer>
              <LineChart data={data?.revenueOverTime ?? []}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={formatTooltipCurrency} />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                  animationDuration={800}
                />
              </LineChart>
            </ChartContainer>
          </ChartSection>

          <ChartSection
            title="Status Breakdown"
            index={2}
            isLoading={isLoading}
            isError={false}
            isEmpty={!isLoading && statusData.length === 0}
            emptyMessage="No status data for this period"
          >
            <ChartContainer>
              <PieChart>
                <Pie
                  data={statusData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={({ name, percent }) =>
                    `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                  }
                  animationDuration={800}
                >
                  {statusData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ChartContainer>
          </ChartSection>

          <ChartSection
            title="Service Category Breakdown"
            index={3}
            isLoading={isLoading}
            isError={false}
            isEmpty={!isLoading && categoryData.length === 0}
            emptyMessage="No category data for this period"
          >
            <ChartContainer>
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="category"
                  tick={{ fontSize: 10 }}
                  angle={-20}
                  textAnchor="end"
                  height={60}
                />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar
                  dataKey="count"
                  fill="#6366f1"
                  radius={[4, 4, 0, 0]}
                  animationDuration={800}
                />
              </BarChart>
            </ChartContainer>
          </ChartSection>
        </div>
      )}
    </div>
  );
}
