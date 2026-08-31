import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  BarChart3,
  Calendar,
  Wrench,
  Users,
} from "lucide-react";
import type { User } from "@/types";
import { paths } from "@/lib/paths";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

export function getNavItems(role: User["role"]): NavItem[] {
  if (role === "ADMIN") {
    return [
      { to: paths.home, label: "Overview", icon: LayoutDashboard, end: true },
      { to: paths.analytics, label: "Analytics", icon: BarChart3 },
      { to: paths.bookings, label: "Bookings", icon: Calendar },
      { to: paths.mechanics, label: "Mechanics", icon: Wrench },
      { to: paths.customers, label: "Customers", icon: Users },
    ];
  }

  if (role === "MECHANIC") {
    return [
      { to: paths.home, label: "My Jobs", icon: LayoutDashboard, end: true },
      { to: paths.bookings, label: "All Assignments", icon: Calendar },
    ];
  }

  // Customers use the consumer portal bottom nav (CustomerLayout)
  return [];
}

export const ADMIN_ONLY_PATHS = [paths.analytics, paths.mechanics, paths.customers];

/** Title for mobile ops header based on current route */
export function getOpsMobileTitle(pathname: string, role: User["role"]): string {
  if (/\/bookings\/[^/]+/.test(pathname)) return "Booking";
  if (/\/mechanics\/[^/]+/.test(pathname)) return "Mechanic";
  if (/\/customers\/[^/]+/.test(pathname)) return "Customer";

  const items = getNavItems(role);
  for (const item of items) {
    if (item.end && pathname === item.to) return item.label;
    if (!item.end && pathname.startsWith(item.to)) return item.label;
  }
  return "Dashboard";
}
