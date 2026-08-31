import { NavLink, Outlet, Link } from "react-router-dom";
import { Wrench } from "lucide-react";
import { paths } from "@/lib/paths";
import { ThemeToggle } from "@/components/ThemeToggle";
import { customerNavItems } from "@/lib/customerNav";
import { cn } from "@/lib/utils";

function CustomerNavLink({
  to,
  label,
  icon: Icon,
  end,
  layout,
}: {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  end?: boolean;
  layout: "mobile" | "desktop";
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          layout === "mobile"
            ? "flex min-w-0 flex-1 flex-col items-center gap-0.5 py-2.5 text-meta font-medium transition-colors"
            : "flex items-center gap-2 rounded-[10px] px-3 py-2 text-body font-medium transition-colors",
          isActive
            ? layout === "mobile"
              ? "text-primary"
              : "bg-primary/10 text-primary"
            : "text-muted-foreground hover:text-foreground",
          layout === "desktop" && !isActive && "hover:bg-muted/50"
        )
      }
    >
      <Icon
        className={cn(
          "shrink-0",
          layout === "mobile" ? "h-5 w-5" : "h-4 w-4"
        )}
        strokeWidth={2}
      />
      <span className="truncate">{label}</span>
    </NavLink>
  );
}

export function CustomerLayout() {
  return (
    <div className="customer-portal min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/90 backdrop-blur-md">
        <div className="mx-auto max-w-3xl px-4 md:px-6">
          <div className="flex h-14 items-center justify-between gap-4">
            <Link
              to={paths.landing}
              className="flex min-w-0 items-center gap-2 rounded-[8px] transition-opacity hover:opacity-90"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-primary text-primary-foreground shadow-[var(--customer-glow)]">
                <Wrench className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-body font-semibold leading-tight">Instant Mechanic</p>
                <p className="text-meta text-muted-foreground">Your service</p>
              </div>
            </Link>
            <ThemeToggle />
          </div>

          {/* Desktop / tablet — nav in header */}
          <nav
            className="hidden border-t border-border/60 md:block"
            aria-label="Customer navigation"
          >
            <div className="flex items-center gap-1 py-2">
              {customerNavItems.map((item) => (
                <CustomerNavLink key={item.to} {...item} layout="desktop" />
              ))}
            </div>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-[calc(4.5rem+env(safe-area-inset-bottom))] pt-5 md:px-6 md:pb-8 md:pt-8">
        <Outlet />
      </main>

      {/* Mobile only — bottom tab bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/80 bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
        aria-label="Customer navigation"
      >
        <div className="mx-auto flex max-w-3xl items-stretch justify-around px-1">
          {customerNavItems.map((item) => (
            <CustomerNavLink key={item.to} {...item} layout="mobile" />
          ))}
        </div>
      </nav>
    </div>
  );
}
