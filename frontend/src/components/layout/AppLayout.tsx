import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Moon, Sun, Menu, X, Zap, LogOut, Wrench } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useSocket } from "@/contexts/SocketContext";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { getNavItems } from "@/lib/nav";
import { paths } from "@/lib/paths";

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [dark, setDark] = useState(() => localStorage.getItem("theme") === "dark");
  const { user, logout } = useAuth();
  const { connected } = useSocket();
  const location = useLocation();
  const navItems = getNavItems(user?.role ?? "CUSTOMER");

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const handleSimulate = async () => {
    setSimulating(true);
    try {
      const result = await api.post<{ simulated: number }>("/api/demo/simulate");
      toast.success(`Advanced ${result.simulated} booking(s)`);
    } catch {
      toast.error("Simulation failed");
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-56 flex-col border-r border-border bg-card transition-transform duration-200 md:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="flex h-14 items-center gap-2 border-b border-border px-4">
          <span className="flex h-7 w-7 items-center justify-center rounded bg-foreground text-background">
            <Wrench className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">Instant Mechanic</p>
            <p className="truncate text-xs text-muted-foreground">Operations</p>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 p-3">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end ?? to === paths.home}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-live)]",
                  isActive
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )
              }
            >
              <Icon className="h-4 w-4 shrink-0 opacity-70" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-border p-3 space-y-2">
          {user?.role === "ADMIN" && (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={handleSimulate}
              loading={simulating}
              loadingText="Running simulation..."
            >
              <Zap className="h-4 w-4" />
              Simulate updates
            </Button>
          )}
          <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  connected ? "bg-primary animate-pulse-live" : "bg-amber-500"
                )}
              />
              {connected ? "Live feed" : "Reconnecting"}
            </span>
            <span className="truncate max-w-[100px]">{user?.name}</span>
          </div>
        </div>
      </aside>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden
        />
      )}

      <div className="flex flex-1 flex-col md:pl-56">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-card/95 px-4 backdrop-blur-sm md:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <div className="flex-1" />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDark(!dark)}
            aria-label="Toggle dark mode"
          >
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            loading={signingOut}
            loadingText="Signing out..."
            aria-label="Sign out"
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
          </Button>
        </header>

        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
