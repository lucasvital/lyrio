import Link from "next/link";
import { signOut } from "@/lib/auth";
import { PeriodFilter } from "@/components/filters/period-filter";

const NAV = [
  { href: "/overview", label: "Overview" },
  { href: "/posthog", label: "PostHog" },
  { href: "/revenuecat", label: "RevenueCat" },
  { href: "/unified", label: "Unified" },
  { href: "/settings", label: "Settings" },
] as const;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-56 shrink-0 border-r border-border p-4 md:block">
        <div className="mb-6 px-2 text-lg font-semibold">Lyrio</div>
        <nav className="space-y-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-lg px-3 py-2 text-sm text-muted transition-colors hover:bg-card hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-border px-6 py-3">
          <div className="flex items-center gap-3 overflow-x-auto md:hidden">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className="text-sm text-muted">
                {item.label}
              </Link>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-4">
            <PeriodFilter />
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <button className="text-sm text-muted hover:text-foreground">Sign out</button>
            </form>
          </div>
        </header>

        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
