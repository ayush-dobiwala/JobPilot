import { UserButton } from "@clerk/clerk-react";
import {
  BarChart3,
  Bot,
  Briefcase,
  CreditCard,
  LayoutDashboard,
  Settings,
  Sparkles,
} from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useEffect } from "react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { warmApi } from "@/lib/api";
import { getClerkAppearance } from "@/lib/clerk";
import { cn } from "@/lib/utils";
import { useThemeStore } from "@/stores/theme";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/applications", label: "Applications", icon: Briefcase },
  { to: "/match-scorer", label: "Match Scorer", icon: Sparkles },
  { to: "/automation", label: "Automation", icon: Bot, soon: true },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: Settings },
  { to: "/billing", label: "Billing", icon: CreditCard },
] as const;

export function AppShell() {
  const theme = useThemeStore((state) => state.theme);
  // One shared /api/me load + wake free-tier API if it was sleeping.
  useCurrentUser();
  useEffect(() => {
    warmApi();
  }, []);

  return (
    <div className="min-h-screen surface-atmosphere">
      <div className="flex min-h-screen">
        <aside className="hidden w-60 shrink-0 border-r border-border/80 bg-card/80 p-4 backdrop-blur-md md:flex md:flex-col">
          <div className="px-2 pb-6">
            <p className="font-display text-lg font-semibold tracking-tight text-foreground">
              JobPilot
            </p>
            <p className="text-xs text-muted-foreground">Application autopilot</p>
          </div>
          <nav className="flex flex-1 flex-col gap-1">
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                  )
                }
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="flex-1">{item.label}</span>
                {"soon" in item && item.soon ? (
                  <Badge className="h-5 border-border/60 bg-secondary px-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    Soon
                  </Badge>
                ) : null}
              </NavLink>
            ))}
          </nav>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border/80 bg-background/80 px-4 py-3 backdrop-blur-md md:px-8">
            <p className="font-display text-base font-semibold md:hidden">JobPilot</p>
            <div className="ml-auto flex items-center gap-3">
              <ThemeToggle />
              <Separator orientation="vertical" className="hidden h-6 sm:block" />
              <UserButton afterSignOutUrl="/" appearance={getClerkAppearance(theme)} />
            </div>
          </header>
          <nav className="flex gap-1 overflow-x-auto border-b border-border/80 bg-card/50 px-3 py-2 md:hidden">
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                  )
                }
              >
                <item.icon className="h-3.5 w-3.5" />
                {item.label}
                {"soon" in item && item.soon ? (
                  <span className="rounded bg-secondary px-1 text-[9px] uppercase text-muted-foreground">
                    Soon
                  </span>
                ) : null}
              </NavLink>
            ))}
          </nav>
          <main className="flex-1 px-4 py-6 md:px-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
