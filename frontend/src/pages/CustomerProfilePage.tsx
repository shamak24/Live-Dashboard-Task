import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { CustomerProfile, Vehicle } from "@/types";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ErrorState } from "@/components/ui/section-states";
import { StatGridSkeleton } from "@/components/ui/loading-skeletons";
import { useAuth } from "@/contexts/AuthContext";

const currentYear = new Date().getFullYear();

export function CustomerProfilePage() {
  const queryClient = useQueryClient();
  const { refreshUser } = useAuth();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [vehicleMake, setVehicleMake] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehicleYear, setVehicleYear] = useState(String(currentYear));
  const [vehiclePlate, setVehiclePlate] = useState("");

  const profileQuery = useQuery({
    queryKey: ["customer-profile"],
    queryFn: () => api.get<CustomerProfile>("/api/customers/me"),
  });

  useEffect(() => {
    if (profileQuery.data) {
      setName(profileQuery.data.name);
      setPhone(profileQuery.data.phone ?? "");
      setAddress(profileQuery.data.address ?? "");
    }
  }, [profileQuery.data]);

  const updateProfileMutation = useMutation({
    mutationFn: (body: {
      name: string;
      phone: string | null;
      address: string | null;
    }) => api.patch<CustomerProfile>("/api/customers/me", body),
    onSuccess: async (data) => {
      queryClient.setQueryData(["customer-profile"], data);
      await refreshUser();
      toast.success("Profile updated");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to update profile");
    },
  });

  const addVehicleMutation = useMutation({
    mutationFn: (body: {
      make: string;
      model: string;
      year: number;
      plate: string;
    }) => api.post<Vehicle>("/api/customers/me/vehicles", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-profile"] });
      setVehicleMake("");
      setVehicleModel("");
      setVehicleYear(String(currentYear));
      setVehiclePlate("");
      toast.success("Vehicle added");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to add vehicle");
    },
  });

  const deleteVehicleMutation = useMutation({
    mutationFn: (vehicleId: string) =>
      api.delete<{ success: boolean }>(`/api/customers/me/vehicles/${vehicleId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-profile"] });
      toast.success("Vehicle removed");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to remove vehicle");
    },
  });

  if (profileQuery.isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="My Profile" description="Manage your account and vehicles" />
        <StatGridSkeleton count={2} />
      </div>
    );
  }

  if (profileQuery.isError) {
    return (
      <ErrorState
        title="Failed to load profile"
        onRetry={() => profileQuery.refetch()}
      />
    );
  }

  const profile = profileQuery.data!;
  const vehicles = profile.vehicles;
  const profileBusy = updateProfileMutation.isPending;
  const vehicleBusy = addVehicleMutation.isPending || deleteVehicleMutation.isPending;

  const handleProfileSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    updateProfileMutation.mutate({
      name: name.trim(),
      phone: phone.trim() ? phone.trim() : null,
      address: address.trim() ? address.trim() : null,
    });
  };

  const handleAddVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    const year = Number(vehicleYear);
    if (
      !vehicleMake.trim() ||
      !vehicleModel.trim() ||
      !vehiclePlate.trim() ||
      !Number.isFinite(year)
    ) {
      toast.error("Please fill in all vehicle fields");
      return;
    }
    addVehicleMutation.mutate({
      make: vehicleMake.trim(),
      model: vehicleModel.trim(),
      year,
      plate: vehiclePlate.trim(),
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Profile"
        description="Update your contact details and manage saved vehicles"
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="ops-panel p-5">
          <h2 className="text-body font-semibold">Account details</h2>
          <form onSubmit={handleProfileSave} className="mt-4 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="profile-name">
                Full name
              </label>
              <Input
                id="profile-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={profileBusy}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="profile-email">
                Email
              </label>
              <Input
                id="profile-email"
                value={profile.email}
                disabled
                className="text-muted-foreground"
              />
              <p className="text-meta">Email cannot be changed here.</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="profile-phone">
                Phone
              </label>
              <Input
                id="profile-phone"
                type="tel"
                placeholder="(555) 123-4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={profileBusy}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="profile-address">
                Service address
              </label>
              <Input
                id="profile-address"
                placeholder="Street address for mechanic visits"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                disabled={profileBusy}
              />
            </div>
            <Button
              type="submit"
              loading={profileBusy}
              loadingText="Saving..."
            >
              Save changes
            </Button>
          </form>
        </div>

        <div className="space-y-6">
          <div className="ops-panel p-5">
            <h2 className="text-body font-semibold">Saved vehicles</h2>
            {vehicles.length === 0 ? (
              <p className="mt-3 text-body text-muted-foreground">
                No vehicles saved yet. Add one below to speed up future bookings.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-border">
                {vehicles.map((v) => (
                  <li
                    key={v.id}
                    className="flex items-center justify-between gap-3 py-3"
                  >
                    <div className="text-body">
                      {v.year} {v.make} {v.model}
                      <span className="ml-2 font-mono text-meta tabular-nums text-muted-foreground">
                        {v.plate}
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-destructive"
                      loading={
                        deleteVehicleMutation.isPending &&
                        deleteVehicleMutation.variables === v.id
                      }
                      loadingText="Removing..."
                      onClick={() => deleteVehicleMutation.mutate(v.id)}
                      disabled={vehicleBusy}
                      aria-label={`Remove ${v.make} ${v.model}`}
                    >
                      <Trash2 className="h-4 w-4" />
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="ops-panel p-5">
            <h2 className="text-body font-semibold">Add a vehicle</h2>
            <form onSubmit={handleAddVehicle} className="mt-4 space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="add-make">Make</label>
                  <Input
                    id="add-make"
                    placeholder="Toyota"
                    value={vehicleMake}
                    onChange={(e) => setVehicleMake(e.target.value)}
                    disabled={vehicleBusy}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="add-model">Model</label>
                  <Input
                    id="add-model"
                    placeholder="Camry"
                    value={vehicleModel}
                    onChange={(e) => setVehicleModel(e.target.value)}
                    disabled={vehicleBusy}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="add-year">Year</label>
                  <Input
                    id="add-year"
                    type="number"
                    min={1980}
                    max={currentYear + 1}
                    value={vehicleYear}
                    onChange={(e) => setVehicleYear(e.target.value)}
                    disabled={vehicleBusy}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="add-plate">Plate</label>
                  <Input
                    id="add-plate"
                    placeholder="ABC-1234"
                    value={vehiclePlate}
                    onChange={(e) => setVehiclePlate(e.target.value)}
                    disabled={vehicleBusy}
                  />
                </div>
              </div>
              <Button
                type="submit"
                variant="outline"
                loading={addVehicleMutation.isPending}
                loadingText="Adding..."
                disabled={deleteVehicleMutation.isPending}
              >
                Add vehicle
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
