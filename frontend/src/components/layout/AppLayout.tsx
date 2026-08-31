import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  Moon,
  Sun,
  Menu,
  X,
  Zap,
  LogOut,
  Wrench,
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/section-states";
import { AnimatedPage } from "@/components/AnimatedPage";
import { useAuth } from "@/contexts/AuthContext";
import { useSocket } from "@/contexts/SocketContext";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { getNavItems } from "@/lib/nav";

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [dark, setDark] = useState(() =>
    localStorage.getItem("theme") === "dark"
  );
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
      toast.success(`Advanced ${result.simulated} booking(s) live`);
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
          "fixed inset-y-0 left-0 z-40 w-64 border-r border-border bg-card transition-transform duration-300 ease-out md:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="flex h-16 items-center gap-2 border-b border-border px-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Wrench className="h-5 w-5 text-primary" />
          </div>
          <span className="font-semibold tracking-tight">Instant Mechanic</span>
        </div>

        <nav className="flex flex-col gap-1 p-4">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end ?? to === "/"}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-primary/10 text-primary shadow-sm"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="absolute bottom-4 left-4 right-4 space-y-2">
          {user?.role === "ADMIN" && (
            <Button
              variant="outline"
              size="sm"
              className="w-full transition-transform active:scale-[0.98]"
              onClick={handleSimulate}
              disabled={simulating}
            >
              {simulating ? (
                <Spinner size="sm" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
              {simulating ? "Simulating..." : "Simulate Live Updates"}
            </Button>
          )}
          <div className="flex items-center justify-between px-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  connected
                    ? "bg-emerald-500 animate-pulse-live"
                    : "bg-amber-500"
                )}
              />
              {connected ? "Live" : "Connecting..."}
            </span>
            <span className="truncate max-w-[120px]">{user?.name}</span>
          </div>
        </div>
      </aside>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm animate-fade-in md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <div className="flex flex-1 flex-col md:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-border bg-card/80 px-4 backdrop-blur-md md:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>

          <div className="flex-1" />

          <Button
            variant="ghost"
            size="icon"
            className="transition-transform active:scale-95"
            onClick={() => setDark(!dark)}
            aria-label="Toggle dark mode"
          >
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="transition-transform active:scale-95"
            onClick={() => logout()}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </header>

        <main className="flex-1 p-4 md:p-6">
          <AnimatedPage>
            <Outlet />
          </AnimatedPage>
        </main>
      </div>
    </div>
  );
}
