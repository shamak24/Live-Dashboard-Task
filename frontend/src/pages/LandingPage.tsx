import { Link } from "react-router-dom";
import { CalendarCheck, ClipboardList, Radio } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { paths } from "@/lib/paths";
import { getDashboardLabel, getLandingGreeting } from "@/lib/landingGreeting";
import { Button } from "@/components/ui/button";
import { RevealSection } from "@/components/landing/RevealSection";
import { DispatchMapVisual } from "@/components/landing/DispatchMapVisual";

const TRUST_MARKS = ["Metro Fleet Co.", "RoadReady Auto", "Summit Motors", "CityDrive"];

const SERVICES = [
  { name: "Oil change", price: "$49+" },
  { name: "Brake repair", price: "$199+" },
  { name: "Tire service", price: "$149+" },
  { name: "Battery", price: "$89+" },
  { name: "Diagnostics", price: "$79+" },
  { name: "AC repair", price: "$129+" },
];

const STATS = [
  { value: "520+", label: "Bookings completed" },
  { value: "22", label: "Vetted mechanics" },
  { value: "< 2h", label: "Typical assign time" },
];

const DISPATCH_ROWS = [
  { id: "BK-4821", status: "En route", color: "var(--status-enroute)", vehicle: "2021 Honda Civic" },
  { id: "BK-4819", status: "In progress", color: "var(--status-progress)", vehicle: "2019 Ford F-150" },
  { id: "BK-4815", status: "Assigned", color: "var(--status-assigned)", vehicle: "2023 Tesla Model 3" },
];

function LiveDispatchStack() {
  return (
    <div className="relative mx-auto w-full max-w-md lg:max-w-none">
      <div
        className="absolute -inset-4 rounded-[12px] bg-primary/10 blur-2xl"
        aria-hidden
      />
      <div
        className="absolute right-4 top-8 w-[88%] rounded-[12px] border border-border bg-card/60 p-4 opacity-50"
        aria-hidden
      >
        <div className="h-24 rounded-[8px] bg-muted/80" />
      </div>

      <div className="relative overflow-hidden rounded-[12px] border border-border bg-card">
        <div className="relative h-36 border-b border-border bg-muted/30">
          <DispatchMapVisual />
        </div>
        <div className="space-y-3 p-5 font-mono text-body">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <span className="text-meta">Live dispatch</span>
            <span className="flex items-center gap-2 text-primary text-meta">
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse-live" />
              Connected
            </span>
          </div>
          {DISPATCH_ROWS.map((row) => (
            <div
              key={row.id}
              className="flex items-center justify-between gap-3 rounded-[8px] border border-border bg-background px-3 py-2"
            >
              <span className="text-meta tabular-nums">{row.id}</span>
              <span className="truncate text-foreground">{row.vehicle}</span>
              <span className="shrink-0 text-meta" style={{ color: row.color }}>
                {row.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function LandingPage() {
  const { user, loading } = useAuth();
  const signedIn = !loading && user;

  return (
    <main className="landing-page">
      {/* Hero */}
      <section className="landing-hero-grid border-b border-border">
        <div className="mx-auto max-w-6xl px-4 py-20 md:px-6 md:py-28">
          <div className="grid gap-14 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div className="space-y-8">
              {signedIn ? (
                <p className="text-section font-semibold text-foreground">
                  {getLandingGreeting(user!)}
                </p>
              ) : (
                <p className="text-body font-medium text-primary">
                  Mobile mechanics, dispatched like a fleet
                </p>
              )}
              <h1 className="landing-display font-semibold tracking-tight text-foreground">
                {signedIn
                  ? "Welcome back — your dispatch hub is ready."
                  : "A mechanic at your driveway, tracked live from request to completion."}
              </h1>
              <p className="max-w-xl text-body text-muted-foreground">
                {signedIn
                  ? user!.role === "ADMIN"
                    ? "Review bookings, fleet status, and live updates from the operations dashboard."
                    : user!.role === "MECHANIC"
                      ? "See your assigned jobs and update status as you work."
                      : "Track your service, book again, or manage your vehicles from your portal."
                  : "Instant Mechanic connects customers who need service at home or work with vetted mechanics in their area. Book oil changes, brakes, tires, and more, then follow each job as it moves through dispatch."}
              </p>
              <div className="flex flex-wrap gap-3">
                {signedIn ? (
                  <>
                    <Button asChild>
                      <Link to={paths.home}>{getDashboardLabel(user!.role)}</Link>
                    </Button>
                    {user!.role === "CUSTOMER" && (
                      <Button variant="outline" asChild>
                        <Link to={paths.customerBook}>Book a service</Link>
                      </Button>
                    )}
                  </>
                ) : (
                  <>
                    <Button asChild>
                      <Link to={`${paths.signup}?role=customer`}>Book a service</Link>
                    </Button>
                    <Button variant="outline" asChild>
                      <Link to={`${paths.signup}?role=mechanic`}>Join as a mechanic</Link>
                    </Button>
                  </>
                )}
              </div>
              {!signedIn && (
                <p className="text-meta">
                  Already have an account?{" "}
                  <Link
                    to={paths.login}
                    className="font-medium text-foreground underline-offset-4 hover:underline"
                  >
                    Sign in
                  </Link>
                </p>
              )}
            </div>
            <LiveDispatchStack />
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <RevealSection>
        <section className="border-b border-border bg-card">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-10 gap-y-4 px-4 py-8 md:px-6">
            <span className="text-meta">Trusted by service teams at</span>
            {TRUST_MARKS.map((name) => (
              <span
                key={name}
                className="text-body font-medium text-muted-foreground"
              >
                {name}
              </span>
            ))}
          </div>
        </section>
      </RevealSection>

      {/* How it works */}
      <RevealSection>
        <section className="mx-auto max-w-6xl px-4 py-20 md:px-6">
          <h2 className="text-section font-semibold">How it works</h2>
          <p className="mt-2 max-w-2xl text-body text-muted-foreground">
            Three stages every booking follows, visible to customers, mechanics, and ops.
          </p>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {[
              {
                step: "Book",
                icon: CalendarCheck,
                text: "Customer picks vehicle, service type, and appointment time from upfront pricing.",
                visual: "01",
              },
              {
                step: "Assigned",
                icon: ClipboardList,
                text: "Dispatch matches an available mechanic without double-booking active jobs.",
                visual: "02",
              },
              {
                step: "Tracked live",
                icon: Radio,
                text: "Status moves from en route to in progress to completed with real-time updates.",
                visual: "03",
              },
            ].map(({ step, icon: Icon, text, visual }) => (
              <div key={step} className="ops-panel p-6">
                <div className="flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[8px] border border-border bg-background">
                    <Icon className="h-5 w-5 text-foreground" />
                  </div>
                  <span className="font-mono text-meta tabular-nums text-muted-foreground">
                    {visual}
                  </span>
                </div>
                <h3 className="mt-4 text-body font-semibold">{step}</h3>
                <p className="mt-2 text-body text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>
        </section>
      </RevealSection>

      {/* Service categories */}
      <RevealSection>
        <section className="landing-hero-grid border-y border-border">
          <div className="mx-auto max-w-6xl px-4 py-20 md:px-6">
            <h2 className="text-section font-semibold">Services we dispatch daily</h2>
            <p className="mt-2 text-body text-muted-foreground">
              Real categories with base pricing, ready to book in the app.
            </p>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {SERVICES.map((s) => (
                <div
                  key={s.name}
                  className="ops-panel flex items-center justify-between px-5 py-4"
                >
                  <span className="text-body font-medium">{s.name}</span>
                  <span className="font-mono text-body tabular-nums text-muted-foreground">
                    {s.price}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </RevealSection>

      {/* Stats */}
      <RevealSection>
        <section className="mx-auto max-w-6xl px-4 py-20 md:px-6">
          <div className="grid gap-8 sm:grid-cols-3">
            {STATS.map((stat) => (
              <div key={stat.label} className="text-center sm:text-left">
                <p className="font-mono text-[36px] font-semibold tabular-nums leading-none text-foreground md:text-[48px]">
                  {stat.value}
                </p>
                <p className="mt-2 text-meta">{stat.label}</p>
              </div>
            ))}
          </div>
        </section>
      </RevealSection>

      {/* Audience */}
      <RevealSection>
        <section className="border-t border-border bg-muted/40">
          <div className="mx-auto max-w-6xl px-4 py-20 md:px-6">
            <h2 className="text-section font-semibold">Built for two sides of the same job</h2>
            <div className="mt-10 grid gap-8 md:grid-cols-2">
              <div className="ops-panel space-y-4 p-6">
                <h3 className="text-body font-semibold">For customers</h3>
                <p className="text-body text-muted-foreground">
                  Pick your vehicle, choose a service, and schedule a visit. Track status from
                  pending through completion without calling the shop for updates.
                </p>
                {signedIn && user!.role === "CUSTOMER" ? (
                  <Button variant="outline" size="sm" asChild>
                    <Link to={paths.customerBook}>Book a service</Link>
                  </Button>
                ) : !signedIn ? (
                  <Button variant="outline" size="sm" asChild>
                    <Link to={`${paths.signup}?role=customer`}>Create customer account</Link>
                  </Button>
                ) : null}
              </div>
              <div className="ops-panel space-y-4 p-6">
                <h3 className="text-body font-semibold">For mechanics</h3>
                <p className="text-body text-muted-foreground">
                  See assigned jobs, update status as you head out and finish work, and keep
                  your availability accurate so dispatch does not double-book you.
                </p>
                {signedIn && user!.role === "MECHANIC" ? (
                  <Button variant="outline" size="sm" asChild>
                    <Link to={paths.home}>View my jobs</Link>
                  </Button>
                ) : !signedIn ? (
                  <Button variant="outline" size="sm" asChild>
                    <Link to={`${paths.signup}?role=mechanic`}>Apply as a mechanic</Link>
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      </RevealSection>

      {/* Final CTA */}
      <RevealSection>
        <section className="bg-foreground text-background">
          <div className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-20">
            <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
              <div>
                <h2 className="text-section font-semibold text-background">
                  {signedIn
                    ? getLandingGreeting(user!)
                    : "Ready to book or join the network?"}
                </h2>
                <p className="mt-2 max-w-lg text-body text-background/70">
                  {signedIn
                    ? "Jump back into your dashboard to manage bookings and live updates."
                    : "Create a customer account to schedule service, or sign up as a mechanic to receive assigned jobs through the same live dispatch system."}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                {signedIn ? (
                  <Button
                    asChild
                    className="bg-primary text-primary-foreground hover:opacity-90"
                  >
                    <Link to={paths.home}>{getDashboardLabel(user!.role)}</Link>
                  </Button>
                ) : (
                  <>
                    <Button
                      asChild
                      className="bg-primary text-primary-foreground hover:opacity-90"
                    >
                      <Link to={`${paths.signup}?role=customer`}>Book a service</Link>
                    </Button>
                    <Button
                      variant="outline"
                      asChild
                      className="border-background/30 bg-transparent text-background hover:bg-background/10"
                    >
                      <Link to={paths.login}>Sign in</Link>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>
      </RevealSection>
    </main>
  );
}
