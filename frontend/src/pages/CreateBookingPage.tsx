import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { paths } from "@/lib/paths";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { formatCurrency, cn } from "@/lib/utils";
import type { CustomerProfile, ServiceCategory, Booking, Vehicle } from "@/types";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ErrorState } from "@/components/ui/section-states";
import { StatGridSkeleton } from "@/components/ui/loading-skeletons";

type VehicleMode = "existing" | "new";

function defaultScheduledAt() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(10, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const currentYear = new Date().getFullYear();

export function CreateBookingPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [vehicleMode, setVehicleMode] = useState<VehicleMode>("existing");
  const [vehicleId, setVehicleId] = useState("");
  const [serviceCategoryId, setServiceCategoryId] = useState("");
  const [scheduledAt, setScheduledAt] = useState(defaultScheduledAt);
  const [vehicleMake, setVehicleMake] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehicleYear, setVehicleYear] = useState(String(currentYear));
  const [vehiclePlate, setVehiclePlate] = useState("");

  const profileQuery = useQuery({
    queryKey: ["customer-profile"],
    queryFn: () => api.get<CustomerProfile>("/api/customers/me"),
  });

  const categoriesQuery = useQuery({
    queryKey: ["service-categories"],
    queryFn: () => api.get<{ data: ServiceCategory[] }>("/api/service-categories"),
  });

  const vehicles = profileQuery.data?.vehicles ?? [];
  const hasSavedVehicles = vehicles.length > 0;

  useEffect(() => {
    if (!hasSavedVehicles) {
      setVehicleMode("new");
      return;
    }
    if (vehicles.length === 1 && !vehicleId && vehicleMode === "existing") {
      setVehicleId(vehicles[0].id);
    }
  }, [hasSavedVehicles, vehicles, vehicleId, vehicleMode]);

  const selectedCategory = useMemo(
    () => categoriesQuery.data?.data.find((c) => c.id === serviceCategoryId),
    [categoriesQuery.data, serviceCategoryId]
  );

  const createMutation = useMutation({
    mutationFn: (body: {
      vehicleId?: string;
      vehicle?: {
        make: string;
        model: string;
        year: number;
        plate: string;
      };
      serviceCategoryId: string;
      scheduledAt: string;
    }) => api.post<Booking>("/api/bookings", body),
    onSuccess: (booking) => {
      queryClient.invalidateQueries({ queryKey: ["customer-profile"] });
      queryClient.invalidateQueries({ queryKey: ["customer-bookings-home"] });
      toast.success("Booking created — we'll assign a mechanic soon");
      navigate(paths.booking(booking.id));
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to create booking");
    },
  });

  const isLoading = profileQuery.isLoading || categoriesQuery.isLoading;
  const isError = profileQuery.isError || categoriesQuery.isError;
  const formDisabled = createMutation.isPending;

  const switchVehicleMode = (mode: VehicleMode) => {
    setVehicleMode(mode);
    if (mode === "existing") {
      setVehicleMake("");
      setVehicleModel("");
      setVehicleYear(String(currentYear));
      setVehiclePlate("");
      if (vehicles.length === 1) {
        setVehicleId(vehicles[0].id);
      }
    } else {
      setVehicleId("");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Book a Service" description="Schedule a mechanic visit" />
        <StatGridSkeleton count={1} />
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        title="Failed to load booking form"
        onRetry={() => {
          profileQuery.refetch();
          categoriesQuery.refetch();
        }}
      />
    );
  }

  const categories = categoriesQuery.data?.data ?? [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!serviceCategoryId || !scheduledAt) {
      toast.error("Please fill in all fields");
      return;
    }

    const scheduled = new Date(scheduledAt);
    if (scheduled.getTime() <= Date.now()) {
      toast.error("Please choose a future date and time");
      return;
    }

    if (vehicleMode === "new") {
      const year = Number(vehicleYear);
      if (
        !vehicleMake.trim() ||
        !vehicleModel.trim() ||
        !vehiclePlate.trim() ||
        !Number.isFinite(year)
      ) {
        toast.error("Please enter your vehicle details");
        return;
      }

      createMutation.mutate({
        vehicle: {
          make: vehicleMake.trim(),
          model: vehicleModel.trim(),
          year,
          plate: vehiclePlate.trim(),
        },
        serviceCategoryId,
        scheduledAt: scheduled.toISOString(),
      });
      return;
    }

    if (!vehicleId) {
      toast.error("Please select a saved vehicle");
      return;
    }

    createMutation.mutate({
      vehicleId,
      serviceCategoryId,
      scheduledAt: scheduled.toISOString(),
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Book a Service"
        description="Choose a saved vehicle or add a new one, then pick your service"
      />

      <div className="ops-panel max-w-xl p-5">
        <h2 className="text-body font-semibold">Service details</h2>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="space-y-3">
            <p className="text-sm font-medium">Vehicle for this visit</p>

            {hasSavedVehicles && (
              <div className="flex rounded-[8px] border border-border p-1">
                <button
                  type="button"
                  className={cn(
                    "flex-1 rounded-[6px] py-2 text-sm font-medium transition-colors",
                    vehicleMode === "existing"
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => switchVehicleMode("existing")}
                  disabled={formDisabled}
                >
                  Saved vehicle
                </button>
                <button
                  type="button"
                  className={cn(
                    "flex-1 rounded-[6px] py-2 text-sm font-medium transition-colors",
                    vehicleMode === "new"
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => switchVehicleMode("new")}
                  disabled={formDisabled}
                >
                  Add new vehicle
                </button>
              </div>
            )}

            {vehicleMode === "existing" && hasSavedVehicles ? (
              <div className="space-y-2">
                <label className="text-meta" htmlFor="vehicle">
                  Previously serviced vehicles
                </label>
                <select
                  id="vehicle"
                  className="h-9 w-full rounded-[8px] border border-border bg-card px-3 text-body"
                  value={vehicleId}
                  onChange={(e) => setVehicleId(e.target.value)}
                  disabled={formDisabled}
                >
                  <option value="">Select a vehicle...</option>
                  {vehicles.map((v: Vehicle) => (
                    <option key={v.id} value={v.id}>
                      {v.year} {v.make} {v.model} ({v.plate})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="space-y-3 rounded-[8px] border border-border bg-muted/20 p-4">
                <p className="text-meta text-muted-foreground">
                  {hasSavedVehicles
                    ? "Enter details for a vehicle not already on your account."
                    : "Add your vehicle so we can dispatch the right mechanic."}
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="make">Make</label>
                    <Input
                      id="make"
                      placeholder="Toyota"
                      value={vehicleMake}
                      onChange={(e) => setVehicleMake(e.target.value)}
                      disabled={formDisabled}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="model">Model</label>
                    <Input
                      id="model"
                      placeholder="Camry"
                      value={vehicleModel}
                      onChange={(e) => setVehicleModel(e.target.value)}
                      disabled={formDisabled}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="year">Year</label>
                    <Input
                      id="year"
                      type="number"
                      min={1980}
                      max={currentYear + 1}
                      value={vehicleYear}
                      onChange={(e) => setVehicleYear(e.target.value)}
                      disabled={formDisabled}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="plate">Plate</label>
                    <Input
                      id="plate"
                      placeholder="ABC-1234"
                      value={vehiclePlate}
                      onChange={(e) => setVehiclePlate(e.target.value)}
                      disabled={formDisabled}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="service">Service type</label>
            <select
              id="service"
              className="h-9 w-full rounded-[8px] border border-border bg-card px-3 text-body"
              value={serviceCategoryId}
              onChange={(e) => setServiceCategoryId(e.target.value)}
              required
              disabled={formDisabled}
            >
              <option value="">Select a service...</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — {formatCurrency(c.basePrice)}
                </option>
              ))}
            </select>
            {selectedCategory?.description && (
              <p className="text-xs text-muted-foreground">
                {selectedCategory.description}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="scheduledAt">
              Preferred date & time
            </label>
            <Input
              id="scheduledAt"
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              required
              disabled={formDisabled}
            />
          </div>

          {selectedCategory && (
            <p className="text-sm text-muted-foreground">
              Estimated price:{" "}
              <span className="font-medium text-foreground">
                {formatCurrency(selectedCategory.basePrice)}
              </span>
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              type="submit"
              loading={createMutation.isPending}
              loadingText="Booking..."
            >
              Confirm booking
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(paths.home)}
              disabled={formDisabled}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
