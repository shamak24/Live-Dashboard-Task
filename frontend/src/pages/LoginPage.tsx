import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { paths } from "@/lib/paths";
import { cn } from "@/lib/utils";

type LoginMode = "user" | "admin";

export function LoginPage() {
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<LoginMode>(
    searchParams.get("mode") === "admin" ? "admin" : "user"
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (searchParams.get("mode") === "admin") {
      setMode("admin");
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(email, password);

      if (mode === "admin" && user.role !== "ADMIN") {
        await logout();
        toast.error("Invalid email or password");
        return;
      }

      navigate(paths.home);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-12 md:py-16">
      <Card className="border-border shadow-none">
        <CardHeader>
          <CardTitle>
            {mode === "admin" ? "Admin sign in" : "Sign in"}
          </CardTitle>
          <CardDescription>
            {mode === "admin"
              ? "Operations dashboard for dispatch and fleet management."
              : "Access your bookings or assigned service jobs."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 flex rounded-[8px] border border-border p-1">
            <button
              type="button"
              className={cn(
                "flex-1 rounded-[6px] py-2 text-sm font-medium transition-colors",
                mode === "user"
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setMode("user")}
              disabled={loading}
            >
              Customer / Mechanic
            </button>
            <button
              type="button"
              className={cn(
                "flex-1 rounded-[6px] py-2 text-sm font-medium transition-colors",
                mode === "admin"
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setMode("admin")}
              disabled={loading}
            >
              Admin
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="email">Email</label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="password">Password</label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
                autoComplete="current-password"
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              loading={loading}
              loadingText={
                mode === "admin" ? "Signing in to dashboard..." : "Signing in..."
              }
            >
              {mode === "admin" ? "Sign in to dashboard" : "Sign in"}
            </Button>
          </form>

          {mode === "user" && (
            <p className="mt-6 text-center text-sm text-muted-foreground">
              New here?{" "}
              <Link to={paths.signup} className="font-medium text-foreground hover:underline">
                Create an account
              </Link>
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
