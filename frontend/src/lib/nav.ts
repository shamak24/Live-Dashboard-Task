import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  BarChart3,
  Calendar,
  Wrench,
  Users,
} from "lucide-react";
import type { User } from "@/types";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

export function getNavItems(role: User["role"]): NavItem[] {
  if (role === "ADMIN") {
    return [
      { to: "/", label: "Overview", icon: LayoutDashboard, end: true },
      { to: "/analytics", label: "Analytics", icon: BarChart3 },
      { to: "/bookings", label: "Bookings", icon: Calendar },
      { to: "/mechanics", label: "Mechanics", icon: Wrench },
      { to: "/customers", label: "Customers", icon: Users },
    ];
  }

  if (role === "MECHANIC") {
    return [
      { to: "/", label: "My Jobs", icon: LayoutDashboard, end: true },
      { to: "/bookings", label: "All Assignments", icon: Calendar },
    ];
  }

  return [
    { to: "/", label: "My Bookings", icon: Calendar, end: true },
    { to: "/bookings", label: "Booking History", icon: LayoutDashboard },
  ];
}

export const ADMIN_ONLY_PATHS = ["/analytics", "/mechanics", "/customers"];
