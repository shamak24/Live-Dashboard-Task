import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { CustomerProfile } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ErrorState } from "@/components/ui/section-states";
import { useAuth } from "@/contexts/AuthContext";

export function CustomerAccountPage() {
  const { logout, refreshUser } = useAuth();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [signingOut, setSigningOut] = useState(false);

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

  const updateMutation = useMutation({
    mutationFn: (body: { name: string; phone: string | null; address: string | null }) =>
      api.patch<CustomerProfile>("/api/customers/me", body),
    onSuccess: async (data) => {
      queryClient.setQueryData(["customer-profile"], data);
      await refreshUser();
      toast.success("Profile updated");
    },
    onError: (err: Error) => toast.error(err.message || "Couldn't save changes"),
  });

  if (profileQuery.isLoading) {
    return <div className="customer-card h-64 skeleton-shimmer" />;
  }

  if (profileQuery.isError) {
    return (
      <ErrorState title="Couldn't load account" onRetry={() => profileQuery.refetch()} />
    );
  }

  const profile = profileQuery.data!;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    updateMutation.mutate({
      name: name.trim(),
      phone: phone.trim() || null,
      address: address.trim() || null,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="customer-headline">Account</h1>
        <p className="mt-2 text-body text-muted-foreground">
          Contact details your mechanic uses for visits.
        </p>
      </div>

      <form onSubmit={handleSave} className="customer-card space-y-4 p-5">
        <div className="space-y-2">
          <label className="text-body font-medium" htmlFor="acc-name">Name</label>
          <Input
            id="acc-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="text-body h-11"
            disabled={updateMutation.isPending}
          />
        </div>
        <div className="space-y-2">
          <label className="text-body font-medium" htmlFor="acc-email">Email</label>
          <Input
            id="acc-email"
            value={profile.email}
            disabled
            className="text-body h-11 text-muted-foreground"
          />
        </div>
        <div className="space-y-2">
          <label className="text-body font-medium" htmlFor="acc-phone">Phone</label>
          <Input
            id="acc-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="text-body h-11"
            disabled={updateMutation.isPending}
          />
        </div>
        <div className="space-y-2">
          <label className="text-body font-medium" htmlFor="acc-address">Service address</label>
          <Input
            id="acc-address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="text-body h-11"
            disabled={updateMutation.isPending}
          />
        </div>
        <Button
          type="submit"
          loading={updateMutation.isPending}
          loadingText="Saving..."
        >
          Save changes
        </Button>
      </form>

      <Button
        variant="outline"
        className="w-full"
        loading={signingOut}
        loadingText="Signing out..."
        onClick={async () => {
          setSigningOut(true);
          try {
            await logout();
          } finally {
            setSigningOut(false);
          }
        }}
      >
        <LogOut className="h-4 w-4" />
        Sign out
      </Button>
    </div>
  );
}
