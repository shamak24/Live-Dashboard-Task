import { useAuth } from "@/contexts/AuthContext";
import { OverviewPage } from "@/pages/OverviewPage";
import { MechanicHomePage } from "@/pages/MechanicHomePage";
import { CustomerPortalHome } from "@/pages/customer/CustomerPortalHome";

export function HomePage() {
  const { user } = useAuth();

  if (user?.role === "MECHANIC") {
    return <MechanicHomePage />;
  }

  if (user?.role === "CUSTOMER") {
    return <CustomerPortalHome />;
  }

  return <OverviewPage />;
}
