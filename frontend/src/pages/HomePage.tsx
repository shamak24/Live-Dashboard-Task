import { useAuth } from "@/contexts/AuthContext";
import { OverviewPage } from "@/pages/OverviewPage";
import { MechanicHomePage } from "@/pages/MechanicHomePage";
import { CustomerHomePage } from "@/pages/CustomerHomePage";

export function HomePage() {
  const { user } = useAuth();

  if (user?.role === "MECHANIC") {
    return <MechanicHomePage />;
  }

  if (user?.role === "CUSTOMER") {
    return <CustomerHomePage />;
  }

  return <OverviewPage />;
}
