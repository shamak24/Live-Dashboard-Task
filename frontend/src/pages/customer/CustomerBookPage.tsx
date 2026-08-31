import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ChevronLeft, Check } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { paths } from "@/lib/paths";
import { formatCurrency, cn } from "@/lib/utils";
import type { CustomerProfile, ServiceCategory, Booking, Vehicle } from "@/types";
import { getServiceIcon } from "@/lib/serviceIcons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ErrorState } from "@/components/ui/section-states";

const currentYear = new Date().getFullYear();

function defaultScheduledAt() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(10, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function initialServiceIds(searchParams: URLSearchParams): Set<string> {
  const raw = searchParams.get("service");
  if (!raw) return new Set();
  return new Set(raw.split(",").filter(Boolean));
}

type Step = "vehicle" | "service" | "schedule" | "confirm" | "done";

export function CustomerBookPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();

  const [step, setStep] = useState<Step>("vehicle");
  const [vehicleMode, setVehicleMode] = useState<"existing" | "new">("existing");
  const [vehicleId, setVehicleId] = useState(searchParams.get("vehicle") ?? "");
  const [serviceCategoryIds, setServiceCategoryIds] = useState<Set<string>>(
    () => initialServiceIds(searchParams)
  );
  const [scheduledAt, setScheduledAt] = useState(defaultScheduledAt());
  const [vehicleMake, setVehicleMake] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehicleYear, setVehicleYear] = useState(String(currentYear));
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [createdBookings, setCreatedBookings] = useState<Booking[]>([]);

  const profileQuery = useQuery({
    queryKey: ["customer-profile"],
    queryFn: () => api.get<CustomerProfile>("/api/customers/me"),
  });

  const categoriesQuery = useQuery({
    queryKey: ["service-categories"],
    queryFn: () => api.get<{ data: ServiceCategory[] }>("/api/service-categories"),
  });

  const vehicles = profileQuery.data?.vehicles ?? [];
  const categories = categoriesQuery.data?.data ?? [];

  useEffect(() => {
    if (vehicles.length === 0) setVehicleMode("new");
    else if (vehicles.length === 1 && !vehicleId) setVehicleId(vehicles[0].id);
  }, [vehicles, vehicleId]);

  const selectedCategories = useMemo(
    () => categories.filter((c) => serviceCategoryIds.has(c.id)),
    [categories, serviceCategoryIds]
  );

  const selectedVehicle = useMemo(() => {
    if (vehicleMode === "new") return null;
    return vehicles.find((v) => v.id === vehicleId);
  }, [vehicleMode, vehicles, vehicleId]);

  const totalAmount = useMemo(
    () => selectedCategories.reduce((sum, c) => sum + c.basePrice, 0),
    [selectedCategories]
  );

  const toggleService = (id: string) => {
    setServiceCategoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const createMutation = useMutation({
    mutationFn: async (input: {
      vehicleId?: string;
      vehicle?: { make: string; model: string; year: number; plate: string };
      serviceIds: string[];
      scheduledAt: string;
    }) => {
      const created: Booking[] = [];
      let resolvedVehicleId = input.vehicleId;

      for (const serviceCategoryId of input.serviceIds) {
        const body = resolvedVehicleId
          ? {
              vehicleId: resolvedVehicleId,
              serviceCategoryId,
              scheduledAt: input.scheduledAt,
            }
          : {
              vehicle: input.vehicle!,
              serviceCategoryId,
              scheduledAt: input.scheduledAt,
            };

        const booking = await api.post<Booking>("/api/bookings", body);
        created.push(booking);
        if (!resolvedVehicleId) {
          resolvedVehicleId = booking.vehicle.id;
        }
      }

      return created;
    },
    onSuccess: (bookings) => {
      queryClient.invalidateQueries({ queryKey: ["customer-profile"] });
      queryClient.invalidateQueries({ queryKey: ["customer-portal-bookings"] });
      setCreatedBookings(bookings);
      setStep("done");
    },
    onError: (err: Error) => {
      toast.error(err.message || "We couldn't complete your booking. Please try again.");
    },
  });

  if (profileQuery.isLoading || categoriesQuery.isLoading) {
    return <div className="customer-card h-64 skeleton-shimmer" />;
  }

  if (profileQuery.isError || categoriesQuery.isError) {
    return (
      <ErrorState
        title="Couldn't load booking options"
        message="Check your connection and try again."
        onRetry={() => {
          profileQuery.refetch();
          categoriesQuery.refetch();
        }}
      />
    );
  }

  if (step === "done" && createdBookings.length > 0) {
    const total = createdBookings.reduce((sum, b) => sum + b.amount, 0);
    const first = createdBookings[0];

    return (
      <div className="flex flex-col items-center py-6 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--status-completed)_15%,transparent)] text-[var(--status-completed)] shadow-[var(--customer-glow)]">
          <CheckCircle2 className="h-10 w-10" />
        </div>
        <h1 className="customer-headline mt-6">You're all booked!</h1>
        <p className="customer-body mt-3 max-w-sm text-muted-foreground">
          {createdBookings.length === 1
            ? `${first.serviceCategory.name} for your ${first.vehicle.make} ${first.vehicle.model}.`
            : `${createdBookings.length} services booked for your ${first.vehicle.make} ${first.vehicle.model}.`}
          We'll notify you when a mechanic is assigned.
        </p>
        {createdBookings.length > 1 && (
          <ul className="mt-4 w-full max-w-sm space-y-2 text-left">
            {createdBookings.map((b) => (
              <li
                key={b.id}
                className="customer-card flex items-center justify-between gap-3 px-4 py-3"
              >
                <span className="text-body">{b.serviceCategory.name}</span>
                <span className="font-mono text-body tabular-nums text-muted-foreground">
                  {formatCurrency(b.amount)}
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4 font-mono text-body font-semibold tabular-nums text-foreground">
          Total {formatCurrency(total)}
        </p>
        <div className="mt-8 flex w-full max-w-xs flex-col gap-3">
          <Button asChild className="w-full h-11">
            <Link to={paths.home}>Track on home</Link>
          </Button>
          {createdBookings.length === 1 && (
            <Button variant="outline" asChild>
              <Link to={paths.booking(first.id)}>View booking</Link>
            </Button>
          )}
        </div>
      </div>
    );
  }

  const goNext = () => {
    if (step === "vehicle") setStep("service");
    else if (step === "service") setStep("schedule");
    else if (step === "schedule") setStep("confirm");
  };

  const goBack = () => {
    if (step === "service") setStep("vehicle");
    else if (step === "schedule") setStep("service");
    else if (step === "confirm") setStep("schedule");
    else navigate(paths.home);
  };

  const canNextVehicle =
    vehicleMode === "new"
      ? vehicleMake.trim() && vehicleModel.trim() && vehiclePlate.trim() && vehicleYear
      : vehicleId;

  const handleConfirm = () => {
    const scheduled = new Date(scheduledAt);
    if (scheduled.getTime() <= Date.now()) {
      toast.error("Please pick a future date and time");
      return;
    }

    const serviceIds = [...serviceCategoryIds];
    const scheduledIso = scheduled.toISOString();

    if (vehicleMode === "new") {
      const year = Number(vehicleYear);
      createMutation.mutate({
        vehicle: {
          make: vehicleMake.trim(),
          model: vehicleModel.trim(),
          year,
          plate: vehiclePlate.trim(),
        },
        serviceIds,
        scheduledAt: scheduledIso,
      });
    } else {
      createMutation.mutate({
        vehicleId,
        serviceIds,
        scheduledAt: scheduledIso,
      });
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button type="button" variant="ghost" size="icon" onClick={goBack} aria-label="Back">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-section font-semibold">Book a service</h1>
          <p className="text-body text-muted-foreground">
            {step === "vehicle" && "Choose your vehicle"}
            {step === "service" && "What do you need?"}
            {step === "schedule" && "Pick a time"}
            {step === "confirm" && "Review and confirm"}
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        {(["vehicle", "service", "schedule", "confirm"] as Step[]).map((s, i) => (
          <div
            key={s}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors",
              step === s || i < ["vehicle", "service", "schedule", "confirm"].indexOf(step)
                ? "bg-primary"
                : "bg-muted"
            )}
          />
        ))}
      </div>

      {step === "vehicle" && (
        <div className="space-y-4">
          {vehicles.length > 0 && (
            <div className="flex rounded-[12px] border border-border p-1">
              <button
                type="button"
                className={cn(
                  "flex-1 rounded-[8px] py-2.5 text-body font-medium transition-colors",
                  vehicleMode === "existing"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground"
                )}
                onClick={() => setVehicleMode("existing")}
              >
                Saved car
              </button>
              <button
                type="button"
                className={cn(
                  "flex-1 rounded-[8px] py-2.5 text-body font-medium transition-colors",
                  vehicleMode === "new"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground"
                )}
                onClick={() => setVehicleMode("new")}
              >
                New car
              </button>
            </div>
          )}

          {vehicleMode === "existing" && vehicles.length > 0 ? (
            <div className="space-y-2">
              {vehicles.map((v: Vehicle) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setVehicleId(v.id)}
                  className={cn(
                    "customer-card relative w-full p-4 text-left transition-all border-2",
                    vehicleId === v.id
                      ? "border-primary bg-primary/10 shadow-[var(--customer-glow)]"
                      : "border-transparent"
                  )}
                >
                  {vehicleId === v.id && (
                    <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check className="h-4 w-4" strokeWidth={2.5} />
                    </span>
                  )}
                  <p className="text-body font-medium">
                    {v.year} {v.make} {v.model}
                  </p>
                  <p className="font-mono text-meta tabular-nums text-muted-foreground">{v.plate}</p>
                </button>
              ))}
            </div>
          ) : (
            <VehicleFields
              make={vehicleMake}
              model={vehicleModel}
              year={vehicleYear}
              plate={vehiclePlate}
              onMake={setVehicleMake}
              onModel={setVehicleModel}
              onYear={setVehicleYear}
              onPlate={setVehiclePlate}
            />
          )}

          <Button className="w-full h-11" disabled={!canNextVehicle} onClick={goNext}>
            Continue
          </Button>
        </div>
      )}

      {step === "service" && (
        <div className="space-y-4">
          <p className="text-body text-muted-foreground">
            Tap to select one or more services. Selected items are highlighted.
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {categories.map((cat) => {
              const Icon = getServiceIcon(cat.name);
              const selected = serviceCategoryIds.has(cat.id);
              return (
                <button
                  key={cat.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => toggleService(cat.id)}
                  className={cn(
                    "customer-card relative flex flex-col items-center gap-2 p-4 text-center transition-all border-2",
                    selected
                      ? "border-primary bg-primary/15 shadow-[var(--customer-glow)]"
                      : "border-transparent hover:border-border"
                  )}
                >
                  {selected && (
                    <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check className="h-4 w-4" strokeWidth={2.5} />
                    </span>
                  )}
                  <Icon
                    className={cn("h-7 w-7", selected ? "text-primary" : "text-muted-foreground")}
                    strokeWidth={1.75}
                  />
                  <span
                    className={cn(
                      "text-body font-medium leading-tight",
                      selected && "text-foreground"
                    )}
                  >
                    {cat.name}
                  </span>
                  <span className="font-mono text-meta tabular-nums text-muted-foreground">
                    {formatCurrency(cat.basePrice)}
                  </span>
                </button>
              );
            })}
          </div>
          {serviceCategoryIds.size > 0 && (
            <p className="text-body font-medium text-primary">
              {serviceCategoryIds.size} service{serviceCategoryIds.size !== 1 ? "s" : ""} selected ·{" "}
              {formatCurrency(totalAmount)}
            </p>
          )}
          <Button
            className="w-full h-11"
            disabled={serviceCategoryIds.size === 0}
            onClick={goNext}
          >
            Continue
          </Button>
        </div>
      )}

      {step === "schedule" && (
        <div className="customer-card space-y-4 p-4">
          <label className="text-body font-medium" htmlFor="schedule">
            When should we come?
          </label>
          <Input
            id="schedule"
            type="datetime-local"
            className="text-body h-12"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
          />
          <p className="text-meta text-muted-foreground">
            A mechanic will be assigned before your appointment time.
          </p>
          <Button className="w-full h-11" onClick={goNext}>
            Continue
          </Button>
        </div>
      )}

      {step === "confirm" && selectedCategories.length > 0 && (
        <div className="space-y-4">
          <div className="customer-card divide-y divide-border">
            <div className="p-4">
              <p className="text-meta text-muted-foreground">Vehicle</p>
              <p className="mt-1 text-body font-medium">
                {vehicleMode === "new"
                  ? `${vehicleYear} ${vehicleMake} ${vehicleModel}`
                  : selectedVehicle
                    ? `${selectedVehicle.year} ${selectedVehicle.make} ${selectedVehicle.model}`
                    : "—"}
              </p>
            </div>
            <div className="p-4">
              <p className="text-meta text-muted-foreground">Services</p>
              <ul className="mt-2 space-y-2">
                {selectedCategories.map((cat) => (
                  <li key={cat.id} className="flex items-center justify-between gap-3 text-body">
                    <span className="font-medium">{cat.name}</span>
                    <span className="font-mono tabular-nums text-muted-foreground">
                      {formatCurrency(cat.basePrice)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="p-4">
              <p className="text-meta text-muted-foreground">Scheduled</p>
              <p className="mt-1 text-body">{new Date(scheduledAt).toLocaleString()}</p>
            </div>
            <div className="flex justify-between p-4">
              <span className="text-body font-medium">Estimated total</span>
              <span className="font-mono text-section font-semibold tabular-nums">
                {formatCurrency(totalAmount)}
              </span>
            </div>
          </div>
          <Button
            className="w-full h-11"
            loading={createMutation.isPending}
            loadingText="Confirming..."
            onClick={handleConfirm}
          >
            Confirm {selectedCategories.length > 1 ? `${selectedCategories.length} bookings` : "booking"}
          </Button>
        </div>
      )}
    </div>
  );
}

function VehicleFields({
  make,
  model,
  year,
  plate,
  onMake,
  onModel,
  onYear,
  onPlate,
}: {
  make: string;
  model: string;
  year: string;
  plate: string;
  onMake: (v: string) => void;
  onModel: (v: string) => void;
  onYear: (v: string) => void;
  onPlate: (v: string) => void;
}) {
  return (
    <div className="customer-card grid gap-3 p-4 sm:grid-cols-2">
      <Input placeholder="Make" value={make} onChange={(e) => onMake(e.target.value)} className="text-body" />
      <Input placeholder="Model" value={model} onChange={(e) => onModel(e.target.value)} className="text-body" />
      <Input
        type="number"
        placeholder="Year"
        min={1980}
        max={currentYear + 1}
        value={year}
        onChange={(e) => onYear(e.target.value)}
        className="text-body"
      />
      <Input placeholder="Plate" value={plate} onChange={(e) => onPlate(e.target.value)} className="text-body" />
    </div>
  );
}
