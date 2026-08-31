import { NavLink, Outlet, useLocation, Link } from "react-router-dom";
import { Menu, X, Zap, LogOut, Wrench } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";
import { useSocket } from "@/contexts/SocketContext";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { getNavItems, getOpsMobileTitle } from "@/lib/nav";
import { paths } from "@/lib/paths";

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const { user, logout } = useAuth();
  const { connected } = useSocket();
  const location = useLocation();
  const role = user?.role ?? "CUSTOMER";
  const navItems = getNavItems(role);
  const hasMobileNav = navItems.length > 0;
  const mobileTitle = getOpsMobileTitle(location.pathname, role);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

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
          "fixed inset-y-0 left-0 z-50 flex w-[min(100vw-3rem,18rem)] flex-col border-r border-border bg-card shadow-none transition-transform duration-200 md:z-40 md:w-56 md:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
        aria-label="Sidebar navigation"
      >
        <div className="flex h-14 items-center justify-between gap-2 border-b border-border px-4">
          <Link
            to={paths.landing}
            className="flex min-w-0 items-center gap-2 rounded-[8px] transition-opacity hover:opacity-90"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-foreground text-background">
              <Wrench className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">Instant Mechanic</p>
              <p className="truncate text-xs text-muted-foreground">Operations</p>
            </div>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden shrink-0"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end ?? to === paths.home}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                cn(
                  "ops-nav-link min-h-[44px]",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )
              }
            >
              <Icon className="h-4 w-4 shrink-0 opacity-70" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-border p-3 space-y-2 pb-[env(safe-area-inset-bottom)]">
          {user?.role === "ADMIN" && (
            <Button
              variant="outline"
              size="sm"
              className="w-full min-h-[40px]"
              onClick={handleSimulate}
              loading={simulating}
              loadingText="Running simulation..."
            >
              <Zap className="h-4 w-4" />
              Simulate updates
            </Button>
          )}
          <div className="flex items-center justify-between gap-2 px-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full shrink-0",
                  connected ? "bg-primary animate-pulse-live" : "bg-amber-500"
                )}
              />
              {connected ? "Live feed" : "Reconnecting"}
            </span>
            <span className="truncate">{user?.name}</span>
          </div>
        </div>
      </aside>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden
        />
      )}

      <div className="flex flex-1 flex-col md:pl-56 min-w-0">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-card/95 px-3 backdrop-blur-sm sm:px-4 md:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 md:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1 md:hidden">
            <p className="truncate text-sm font-semibold">{mobileTitle}</p>
            <p className="truncate text-meta text-muted-foreground">{user?.name}</p>
          </div>
          <div className="hidden flex-1 md:block" />
          <div className="flex shrink-0 items-center gap-1">
            <span
              className={cn(
                "hidden h-2 w-2 rounded-full sm:block",
                connected ? "bg-primary animate-pulse-live" : "bg-amber-500"
              )}
              aria-hidden
            />
            <ThemeToggle />
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
          </div>
        </header>

        <main
          className={cn(
            "flex-1 min-w-0 p-4 md:p-6 lg:p-8",
            hasMobileNav && "pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-6"
          )}
        >
          <Outlet />
        </main>

        {hasMobileNav && (
          <nav
            className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-card/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)] md:hidden"
            aria-label="Mobile navigation"
          >
            <div className="ops-mobile-nav">
              {navItems.map(({ to, label, icon: Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end ?? to === paths.home}
                  className={({ isActive }) =>
                    cn("ops-mobile-nav-link", isActive && "active")
                  }
                >
                  <Icon className="h-5 w-5 shrink-0" strokeWidth={2} />
                  <span className="truncate max-w-full">{label}</span>
                </NavLink>
              ))}
            </div>
          </nav>
        )}
      </div>
    </div>
  );
}
