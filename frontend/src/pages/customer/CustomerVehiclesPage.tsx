import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Car, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { CustomerProfile, Vehicle } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ErrorState } from "@/components/ui/section-states";

const currentYear = new Date().getFullYear();

export function CustomerVehiclesPage() {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState(String(currentYear));
  const [plate, setPlate] = useState("");

  const profileQuery = useQuery({
    queryKey: ["customer-profile"],
    queryFn: () => api.get<CustomerProfile>("/api/customers/me"),
  });

  const addMutation = useMutation({
    mutationFn: (body: { make: string; model: string; year: number; plate: string }) =>
      api.post<Vehicle>("/api/customers/me/vehicles", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-profile"] });
      setShowAdd(false);
      setMake("");
      setModel("");
      setPlate("");
      toast.success("Vehicle added");
    },
    onError: (err: Error) => toast.error(err.message || "Couldn't add vehicle"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      api.delete<{ success: boolean }>(`/api/customers/me/vehicles/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-profile"] });
      toast.success("Vehicle removed");
    },
    onError: (err: Error) => toast.error(err.message || "Couldn't remove vehicle"),
  });

  if (profileQuery.isLoading) {
    return <div className="customer-card h-48 skeleton-shimmer" />;
  }

  if (profileQuery.isError) {
    return (
      <ErrorState title="Couldn't load vehicles" onRetry={() => profileQuery.refetch()} />
    );
  }

  const vehicles = profileQuery.data?.vehicles ?? [];

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const y = Number(year);
    if (!make.trim() || !model.trim() || !plate.trim() || !Number.isFinite(y)) {
      toast.error("Please fill in all fields");
      return;
    }
    addMutation.mutate({
      make: make.trim(),
      model: model.trim(),
      year: y,
      plate: plate.trim(),
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="customer-headline">Your vehicles</h1>
          <p className="mt-2 text-body text-muted-foreground">
            Cars you book service for — add new ones anytime.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAdd((v) => !v)}
          className="shrink-0"
        >
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="customer-card space-y-3 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input placeholder="Make" value={make} onChange={(e) => setMake(e.target.value)} />
            <Input placeholder="Model" value={model} onChange={(e) => setModel(e.target.value)} />
            <Input
              type="number"
              placeholder="Year"
              min={1980}
              max={currentYear + 1}
              value={year}
              onChange={(e) => setYear(e.target.value)}
            />
            <Input placeholder="Plate" value={plate} onChange={(e) => setPlate(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <Button
              type="submit"
              loading={addMutation.isPending}
              loadingText="Adding..."
            >
              Save vehicle
            </Button>
            <Button type="button" variant="ghost" onClick={() => setShowAdd(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {vehicles.length === 0 ? (
        <div className="customer-card p-8 text-center">
          <Car className="mx-auto h-12 w-12 text-primary/60" strokeWidth={1.5} />
          <p className="mt-4 text-body font-medium">No vehicles yet</p>
          <p className="mt-1 text-body text-muted-foreground">
            Add your car to make booking faster next time.
          </p>
          <Button className="mt-4" onClick={() => setShowAdd(true)}>
            Add your first vehicle
          </Button>
        </div>
      ) : (
        <ul className="space-y-3">
          {vehicles.map((v) => (
            <li
              key={v.id}
              className="customer-card flex items-center justify-between gap-3 p-4"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-[12px] bg-primary/10 text-primary">
                  <Car className="h-6 w-6" strokeWidth={1.75} />
                </div>
                <div>
                  <p className="text-body font-semibold">
                    {v.year} {v.make} {v.model}
                  </p>
                  <p className="font-mono text-meta tabular-nums text-muted-foreground">
                    {v.plate}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-destructive"
                loading={
                  deleteMutation.isPending && deleteMutation.variables === v.id
                }
                loadingText="Removing..."
                onClick={() => deleteMutation.mutate(v.id)}
                disabled={addMutation.isPending}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
