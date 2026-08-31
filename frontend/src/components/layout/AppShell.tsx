import { useAuth } from "@/contexts/AuthContext";
import { CustomerLayout } from "@/components/layout/CustomerLayout";
import { AppLayout } from "@/components/layout/AppLayout";

/** Routes customers into the consumer portal; admin/mechanic keep the ops console. */
export function AppShell() {
  const { user } = useAuth();

  if (user?.role === "CUSTOMER") {
    return <CustomerLayout />;
  }

  return <AppLayout />;
}
