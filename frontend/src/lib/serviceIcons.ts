import type { LucideIcon } from "lucide-react";
import {
  Droplets,
  CircleDot,
  Circle,
  Battery,
  Snowflake,
  Gauge,
  Cog,
  Wrench,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  "Oil Change": Droplets,
  "Brake Repair": CircleDot,
  "Tire Replacement": Circle,
  "Battery Service": Battery,
  "AC Repair": Snowflake,
  "General Diagnostics": Gauge,
  "Transmission Service": Cog,
};

export function getServiceIcon(name: string): LucideIcon {
  return ICONS[name] ?? Wrench;
}
