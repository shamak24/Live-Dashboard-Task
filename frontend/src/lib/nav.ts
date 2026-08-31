import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  BarChart3,
  Calendar,
  Wrench,
  Users,
  CalendarPlus,
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

  return [
    { to: paths.home, label: "My Bookings", icon: Calendar, end: true },
    { to: paths.bookingsNew, label: "Book Service", icon: CalendarPlus },
    { to: paths.bookings, label: "Booking History", icon: LayoutDashboard },
  ];
}

export const ADMIN_ONLY_PATHS = [paths.analytics, paths.mechanics, paths.customers];
