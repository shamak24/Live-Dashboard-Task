import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import type { CustomerProfile, ServiceCategory, Booking } from "@/types";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorState, Spinner } from "@/components/ui/section-states";
import { StatGridSkeleton } from "@/components/ui/loading-skeletons";

function defaultScheduledAt() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(10, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function CreateBookingPage() {
  const navigate = useNavigate();
  const [vehicleId, setVehicleId] = useState("");
  const [serviceCategoryId, setServiceCategoryId] = useState("");
  const [scheduledAt, setScheduledAt] = useState(defaultScheduledAt);

  const profileQuery = useQuery({
    queryKey: ["customer-profile"],
    queryFn: () => api.get<CustomerProfile>("/api/customers/me"),
  });

  const categoriesQuery = useQuery({
    queryKey: ["service-categories"],
    queryFn: () => api.get<{ data: ServiceCategory[] }>("/api/service-categories"),
  });

  const selectedCategory = useMemo(
    () => categoriesQuery.data?.data.find((c) => c.id === serviceCategoryId),
    [categoriesQuery.data, serviceCategoryId]
  );

  const createMutation = useMutation({
    mutationFn: (body: {
      vehicleId: string;
      serviceCategoryId: string;
      scheduledAt: string;
    }) => api.post<Booking>("/api/bookings", body),
    onSuccess: (booking) => {
      toast.success("Booking created — we'll assign a mechanic soon");
      navigate(`/bookings/${booking.id}`);
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to create booking");
    },
  });

  const isLoading = profileQuery.isLoading || categoriesQuery.isLoading;
  const isError = profileQuery.isError || categoriesQuery.isError;

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

  const profile = profileQuery.data!;
  const categories = categoriesQuery.data?.data ?? [];
  const vehicles = profile.vehicles;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!vehicleId || !serviceCategoryId || !scheduledAt) {
      toast.error("Please fill in all fields");
      return;
    }

    const scheduled = new Date(scheduledAt);
    if (scheduled.getTime() <= Date.now()) {
      toast.error("Please choose a future date and time");
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
        description="Choose your vehicle, service type, and preferred appointment time"
      />

      {vehicles.length === 0 ? (
        <Card className="animate-fade-in-up">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No vehicles on your account. Contact support to add a vehicle before booking.
          </CardContent>
        </Card>
      ) : (
        <Card className="animate-fade-in-up stagger-1 max-w-xl">
          <CardHeader>
            <CardTitle className="text-base">Service details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="vehicle">
                  Vehicle
                </label>
                <select
                  id="vehicle"
                  className="h-9 w-full rounded-md border border-border bg-card px-3 text-sm"
                  value={vehicleId}
                  onChange={(e) => setVehicleId(e.target.value)}
                  required
                >
                  <option value="">Select your vehicle...</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.year} {v.make} {v.model} ({v.plate})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="service">
                  Service type
                </label>
                <select
                  id="service"
                  className="h-9 w-full rounded-md border border-border bg-card px-3 text-sm"
                  value={serviceCategoryId}
                  onChange={(e) => setServiceCategoryId(e.target.value)}
                  required
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
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? (
                    <>
                      <Spinner size="sm" />
                      Booking...
                    </>
                  ) : (
                    "Confirm booking"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/")}
                  disabled={createMutation.isPending}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
