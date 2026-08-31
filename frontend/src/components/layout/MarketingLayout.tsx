import { Link, Outlet } from "react-router-dom";
import { Wrench } from "lucide-react";
import { paths } from "@/lib/paths";
import { Button } from "@/components/ui/button";

export function MarketingLayout() {
  return (
    <div className="marketing-surface min-h-screen">
      <header className="border-b border-border/80">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-6">
          <Link
            to={paths.landing}
            className="flex items-center gap-2 font-semibold tracking-tight text-foreground"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-foreground text-background">
              <Wrench className="h-4 w-4" />
            </span>
            Instant Mechanic
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link to={paths.login}>Sign in</Link>
            </Button>
            <Button size="sm" asChild>
              <Link to={paths.signup}>Get started</Link>
            </Button>
          </div>
        </div>
      </header>
      <Outlet />
      <footer className="border-t border-border/80 py-8">
        <div className="mx-auto max-w-6xl px-4 text-sm text-muted-foreground md:px-6">
          <p>Instant Mechanic — on-demand vehicle service, dispatched and tracked in real time.</p>
        </div>
      </footer>
    </div>
  );
}
