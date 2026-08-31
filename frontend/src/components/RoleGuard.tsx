import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { paths } from "@/lib/paths";

export function RoleGuard({
  children,
  roles,
}: {
  children: React.ReactNode;
  roles: import("@/types").User["role"][];
}) {
  const { user } = useAuth();

  if (!user || !roles.includes(user.role)) {
    return <Navigate to={paths.home} replace />;
  }

  return children;
}
