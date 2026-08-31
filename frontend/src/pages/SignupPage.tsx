import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { paths } from "@/lib/paths";
import { cn } from "@/lib/utils";

type SignupRole = "CUSTOMER" | "MECHANIC";

export function SignupPage() {
  const [searchParams] = useSearchParams();
  const initialRole =
    searchParams.get("role") === "mechanic" ? "MECHANIC" : "CUSTOMER";

  const [role, setRole] = useState<SignupRole>(initialRole);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const r = searchParams.get("role");
    if (r === "mechanic") setRole("MECHANIC");
    if (r === "customer") setRole("CUSTOMER");
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register({
        name,
        email,
        password,
        role,
        specialty: role === "MECHANIC" ? specialty : undefined,
      });
      navigate(paths.home);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign up failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-12 md:py-16">
      <Card className="border-border shadow-none">
        <CardHeader>
          <CardTitle>Create your account</CardTitle>
          <CardDescription>
            {role === "CUSTOMER"
              ? "Book mobile vehicle service and track your appointments."
              : "Join the mechanic network and receive assigned jobs."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 flex rounded-md border border-border p-1">
            <button
              type="button"
              className={cn(
                "flex-1 rounded-sm py-2 text-sm font-medium transition-colors",
                role === "CUSTOMER"
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setRole("CUSTOMER")}
              disabled={loading}
            >
              I&apos;m a customer
            </button>
            <button
              type="button"
              className={cn(
                "flex-1 rounded-sm py-2 text-sm font-medium transition-colors",
                role === "MECHANIC"
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setRole("MECHANIC")}
              disabled={loading}
            >
              I&apos;m a mechanic
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="name">Full name</label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="email">Email</label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="password">Password</label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">At least 6 characters</p>
            </div>
            {role === "MECHANIC" && (
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="specialty">
                  Primary specialty
                </label>
                <Input
                  id="specialty"
                  placeholder="e.g. Brakes, Oil change, Diagnostics"
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  disabled={loading}
                />
              </div>
            )}
            <Button
              type="submit"
              className="w-full"
              loading={loading}
              loadingText="Creating account..."
            >
              Create account
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to={paths.login} className="font-medium text-foreground hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
