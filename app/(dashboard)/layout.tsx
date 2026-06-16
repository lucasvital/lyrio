import { signOut } from "@/lib/auth";
import { PeriodFilter } from "@/components/filters/period-filter";
import { SidebarNav } from "@/components/sidebar-nav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 border-r border-border/70 p-4 md:flex md:flex-col">
        <div className="mb-6 flex items-center gap-2 px-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/15 text-sm font-bold text-primary">
            L
          </span>
          <span className="text-lg font-semibold tracking-tight">Lyrio</span>
        </div>
        <SidebarNav />
        <p className="mt-auto px-2 pt-6 text-[11px] text-muted">
          PostHog × RevenueCat
        </p>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex items-center gap-4 border-b border-border/70 bg-background/80 px-4 py-3 backdrop-blur-md sm:px-6">
          <div className="flex items-center gap-2 md:hidden">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary/15 text-xs font-bold text-primary">
              L
            </span>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <PeriodFilter />
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <button className="rounded-lg px-2.5 py-1.5 text-sm text-muted transition-colors hover:bg-elevated hover:text-foreground">
                Sign out
              </button>
            </form>
          </div>
        </header>

        <div className="border-b border-border/70 px-4 py-2 md:hidden">
          <SidebarNav compact />
        </div>

        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
