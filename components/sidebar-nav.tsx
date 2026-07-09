"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BarChart3,
  DollarSign,
  Layers,
  Target,
  Users,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/overview", label: "Overview", icon: LayoutDashboard },
  { href: "/posthog", label: "PostHog", icon: BarChart3 },
  { href: "/revenuecat", label: "RevenueCat", icon: DollarSign },
  { href: "/unified", label: "Unified", icon: Layers },
  { href: "/attribution", label: "Atribuição", icon: Target },
  { href: "/influencers", label: "Influencers", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function SidebarNav({ compact = false }: { compact?: boolean }) {
  const pathname = usePathname();
  return (
    <nav className={cn(compact ? "flex gap-1 overflow-x-auto" : "space-y-1")}>
      {NAV.map((item) => {
        const active = pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
              compact ? "shrink-0" : "",
              active
                ? "bg-primary/12 font-medium text-foreground ring-1 ring-primary/20"
                : "text-muted hover:bg-elevated hover:text-foreground",
            )}
          >
            <Icon size={16} strokeWidth={2} className={active ? "text-primary" : ""} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
