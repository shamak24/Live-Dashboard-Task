import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import type { User } from "@/types";

export function RoleGuard({
  children,
  roles,
}: {
  children: React.ReactNode;
  roles: User["role"][];
}) {
  const { user } = useAuth();

  if (!user || !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
