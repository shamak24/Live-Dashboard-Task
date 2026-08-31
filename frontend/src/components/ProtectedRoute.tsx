import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeaderSkeleton, StatGridSkeleton } from "@/components/ui/loading-skeletons";
import { Spinner } from "@/components/ui/section-states";

export function ProtectedRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <div className="flex flex-1 items-center justify-center p-8">
          <div className="flex flex-col items-center gap-4">
            <Spinner size="lg" />
            <p className="text-sm text-muted-foreground">Loading your dashboard...</p>
          </div>
        </div>
        <div className="hidden p-8 md:block">
          <PageHeaderSkeleton />
          <div className="mt-6">
            <StatGridSkeleton count={4} />
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
