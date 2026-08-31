import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/section-states";
import { useAuth } from "@/contexts/AuthContext";
import { Wrench } from "lucide-react";

export function LoginPage() {
  const [email, setEmail] = useState("admin@instantmechanic.com");
  const [password, setPassword] = useState("password123");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,oklch(0.55_0.2_255/0.08),transparent_50%)]" />
      <Card className="animate-scale-in w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
            <Wrench className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Instant Mechanic</CardTitle>
          <CardDescription>Operations dashboard sign in</CardDescription>
        </CardHeader>
        <CardContent>
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
              />
            </div>
            <Button type="submit" className="w-full transition-transform active:scale-[0.98]" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <Spinner size="sm" />
                  Signing in...
                </span>
              ) : (
                "Sign in"
              )}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Demo: admin@instantmechanic.com / password123
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
