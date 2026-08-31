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
import { ChartSkeleton } from "@/components/ui/loading-skeletons";
import { ErrorState, EmptyState } from "@/components/ui/section-states";
import { PageHeader } from "@/components/PageHeader";
import { formatCurrency } from "@/lib/utils";

interface AnalyticsSummary {
  bookingsOverTime: { date: string; count: number }[];
  revenueOverTime: { date: string; revenue: number }[];
  statusBreakdown: BreakdownItem[];
  categoryBreakdown: BreakdownItem[];
}

const CHART_TOOLTIP = {
  contentStyle: {
    background: "var(--color-card)",
    border: "1px solid var(--color-border)",
    borderRadius: "8px",
    fontSize: "12px",
    color: "var(--color-foreground)",
  },
  labelStyle: { color: "var(--color-muted-foreground)" },
};

const AXIS_TICK = { fontSize: 11, fill: "var(--color-muted-foreground)" };

function ChartContainer({ children }: { children: React.ReactElement }) {
  return (
    <div className="h-[220px] sm:h-[280px] w-full min-w-0">
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
  children,
}: {
  title: string;
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  isEmpty?: boolean;
  emptyMessage?: string;
  onRetry?: () => void;
  children: React.ReactNode;
}) {
  if (isLoading) {
    return <ChartSkeleton />;
  }

  if (isError) {
    return (
      <div className="ops-panel p-4">
        <h3 className="text-body font-semibold">{title}</h3>
        <div className="mt-4">
          <ErrorState
            title="Chart failed to load"
            message={errorMessage}
            onRetry={onRetry}
          />
        </div>
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="ops-panel p-4">
        <h3 className="text-body font-semibold">{title}</h3>
        <div className="mt-4">
          <EmptyState title={emptyMessage ?? "No data for this period"} />
        </div>
      </div>
    );
  }

  return (
    <div className="ops-panel p-4">
      <h3 className="text-body font-semibold">{title}</h3>
      <div className="mt-4">{children}</div>
    </div>
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
            isLoading={isLoading}
            isError={false}
            isEmpty={!isLoading && data?.bookingsOverTime.length === 0}
            emptyMessage="No bookings in this date range"
          >
            <ChartContainer>
              <LineChart data={data?.bookingsOverTime ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="date" tick={AXIS_TICK} />
                <YAxis tick={AXIS_TICK} allowDecimals={false} />
                <Tooltip {...CHART_TOOLTIP} />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="var(--color-primary)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ChartContainer>
          </ChartSection>

          <ChartSection
            title="Revenue Over Time"
            isLoading={isLoading}
            isError={false}
            isEmpty={!isLoading && data?.revenueOverTime.length === 0}
            emptyMessage="No completed bookings in this date range"
          >
            <ChartContainer>
              <LineChart data={data?.revenueOverTime ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="date" tick={AXIS_TICK} />
                <YAxis tick={AXIS_TICK} />
                <Tooltip {...CHART_TOOLTIP} formatter={formatTooltipCurrency} />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="var(--status-completed)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ChartContainer>
          </ChartSection>

          <ChartSection
            title="Status Breakdown"
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
                  animationDuration={600}
                >
                  {statusData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip {...CHART_TOOLTIP} />
                <Legend wrapperStyle={{ fontSize: "12px" }} />
              </PieChart>
            </ChartContainer>
          </ChartSection>

          <ChartSection
            title="Service Category Breakdown"
            isLoading={isLoading}
            isError={false}
            isEmpty={!isLoading && categoryData.length === 0}
            emptyMessage="No category data for this period"
          >
            <ChartContainer>
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis
                  dataKey="category"
                  tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                  angle={-20}
                  textAnchor="end"
                  height={60}
                />
                <YAxis tick={AXIS_TICK} allowDecimals={false} />
                <Tooltip {...CHART_TOOLTIP} />
                <Bar
                  dataKey="count"
                  fill="var(--status-assigned)"
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          </ChartSection>
        </div>
      )}
    </div>
  );
}
