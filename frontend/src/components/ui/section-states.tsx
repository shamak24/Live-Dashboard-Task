import { Loader2, RefreshCw, Inbox, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Spinner({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClass =
    size === "sm" ? "h-4 w-4" : size === "lg" ? "h-8 w-8" : "h-5 w-5";
  return (
    <Loader2
      className={cn("animate-spin text-primary", sizeClass, className)}
      aria-hidden
    />
  );
}

export function SectionLoader({
  label = "Loading...",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 py-8 text-muted-foreground",
        className
      )}
    >
      <Spinner size="lg" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function InlineLoader({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2 text-sm text-muted-foreground", className)}>
      <Spinner size="sm" />
      <span>Updating...</span>
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-[12px] border border-border bg-card p-8 text-center">
      <AlertCircle className="mx-auto h-10 w-10 text-muted-foreground" />
      <p className="mt-3 font-medium text-foreground">{title}</p>
      {message && (
        <p className="mt-1 text-body text-muted-foreground">{message}</p>
      )}
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
          <RefreshCw className="h-4 w-4" />
          Try again
        </Button>
      )}
    </div>
  );
}

export function EmptyState({
  title = "No results",
  description,
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="rounded-[12px] border border-dashed border-border bg-muted/20 p-8 text-center">
      <Inbox className="mx-auto h-10 w-10 text-muted-foreground/60" />
      <p className="mt-3 text-body font-medium">{title}</p>
      {description && (
        <p className="mt-1 text-body text-muted-foreground">{description}</p>
      )}
    </div>
  );
}
