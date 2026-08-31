export interface User {
  id: string;
  name: string;
  email: string;
  role: "CUSTOMER" | "MECHANIC" | "ADMIN";
}

export interface DashboardStats {
  totalBookings: number;
  todayBookings: number;
  completed: number;
  pending: number;
  cancelled: number;
  totalRevenue: number;
  activeMechanics: number;
  newCustomers: number;
}

export interface Booking {
  id: string;
  status: string;
  amount: number;
  scheduledAt: string;
  createdAt: string;
  updatedAt: string;
  preVisitSummary?: string | null;
  postVisitSummary?: string | null;
  version: number;
  customer: {
    id: string;
    phone?: string | null;
    address?: string | null;
    user: { id: string; name: string; email: string };
  };
  vehicle: {
    id: string;
    make: string;
    model: string;
    year: number;
    plate: string;
  };
  mechanic?: {
    id: string;
    status: string;
    specialty?: string | null;
    user: { id: string; name: string; email: string };
  } | null;
  serviceCategory: {
    id: string;
    name: string;
    description?: string | null;
    basePrice: number;
  };
}

export interface PaginatedBookings {
  data: Booking[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface MechanicListItem {
  id: string;
  name: string;
  email: string;
  status: string;
  jobsCompleted: number;
  specialty?: string | null;
  currentBooking: Booking | null;
  lastBooking: Booking | null;
}

export interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  plate: string;
}

export interface CustomerProfile {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  vehicles: Vehicle[];
}

export interface ServiceCategory {
  id: string;
  name: string;
  description?: string | null;
  basePrice: number;
}

export interface ChartDataPoint {
  date: string;
  count?: number;
  revenue?: number;
}

export interface BreakdownItem {
  status?: string;
  category?: string;
  count: number;
}

export interface ActivityLog {
  id: string;
  message: string;
  createdAt: string;
}
