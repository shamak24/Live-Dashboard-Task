import type { LucideIcon } from "lucide-react";
import {
  Home,
  CalendarPlus,
  Clock,
  Car,
  UserRound,
} from "lucide-react";
import { paths } from "@/lib/paths";

export interface CustomerNavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

export const customerNavItems: CustomerNavItem[] = [
  { to: paths.home, label: "Home", icon: Home, end: true },
  { to: paths.customerBook, label: "Book", icon: CalendarPlus },
  { to: paths.customerHistory, label: "History", icon: Clock },
  { to: paths.customerVehicles, label: "Vehicles", icon: Car },
  { to: paths.customerAccount, label: "Account", icon: UserRound },
];

export const CUSTOMER_TRACKING_STEPS = [
  { status: "PENDING", label: "Booked" },
  { status: "ASSIGNED", label: "Assigned" },
  { status: "MECHANIC_ON_THE_WAY", label: "On the way" },
  { status: "IN_PROGRESS", label: "In progress" },
  { status: "COMPLETED", label: "Completed" },
] as const;

export const ACTIVE_BOOKING_STATUSES = [
  "PENDING",
  "ASSIGNED",
  "MECHANIC_ON_THE_WAY",
  "IN_PROGRESS",
] as const;

export function trackingStepIndex(status: string): number {
  const idx = CUSTOMER_TRACKING_STEPS.findIndex((s) => s.status === status);
  return idx >= 0 ? idx : 0;
}
