import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className={cn("animate-fade-in-up", `stagger-${Math.min(i + 1, 8)}`)}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-4 rounded-full" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-20" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function TableSkeleton({
  rows = 8,
  columns = 6,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-border animate-fade-in">
      <div className="border-b border-border bg-muted/40 px-4 py-3">
        <div className="flex gap-4">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} className="h-4 flex-1" />
          ))}
        </div>
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, row) => (
          <div key={row} className="flex gap-4 px-4 py-3.5">
            {Array.from({ length: columns }).map((_, col) => (
              <Skeleton
                key={col}
                className={cn("h-4 flex-1", col === 0 && "max-w-[140px]")}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ChartSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn("animate-fade-in-up", className)}>
      <CardHeader>
        <Skeleton className="h-5 w-40" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[280px] w-full rounded-lg" />
      </CardContent>
    </Card>
  );
}

export function DetailCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className={cn("animate-fade-in-up", `stagger-${Math.min(i + 1, 4)}`)}>
          <CardHeader>
            <Skeleton className="h-5 w-28" />
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function PageHeaderSkeleton() {
  return (
    <div className="space-y-2 animate-fade-in">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-72" />
    </div>
  );
}
