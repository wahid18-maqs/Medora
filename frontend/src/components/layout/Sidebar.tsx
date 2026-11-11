"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  History,
  HeartPulse,
  Settings,
  Droplet,
  LogOut,
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface SidebarProps {
  activeHref?: string;
}

function CollapsedTooltip({ show, label }: { show: boolean; label: string }) {
  if (!show) return null;
  return (
    <span className="pointer-events-none absolute left-full top-1/2 z-[60] ml-3 -translate-y-1/2 whitespace-nowrap rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground opacity-0 shadow-md transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100">
      {label}
    </span>
  );
}

function NavLink({
  href,
  label,
  icon: Icon,
  isCollapsed,
  isActive,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  isCollapsed: boolean;
  isActive: boolean;
}) {
  return (
    <a
      href={href}
      aria-label={label}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "group relative flex items-center rounded-lg text-sm transition-all",
        isCollapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2",
        isActive
          ? "bg-primary font-medium text-primary-foreground shadow-xs"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <Icon size={18} className="shrink-0" />
      {!isCollapsed && <span className="truncate">{label}</span>}
      <CollapsedTooltip show={isCollapsed} label={label} />
    </a>
  );
}

export default function Sidebar({ activeHref = "/dashboard" }: SidebarProps) {
  const { logout } = useAuth();
  const pathname = usePathname();
  const currentPath = pathname || activeHref;
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("sidebar_collapsed");
    if (saved !== null) {
      setIsCollapsed(saved === "true");
    }
  }, []);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("sidebar_collapsed", String(next));
      return next;
    });
  };

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/dashboard/history", label: "Reports History", icon: History },
    { href: "/dashboard/profile", label: "Health Profile", icon: HeartPulse },
  ] as const;

  const secondaryItems = [
    { href: "/dashboard/settings", label: "Settings", icon: Settings },
  ] as const;

  return (
    <aside
      className={cn(
        "relative flex shrink-0 select-none flex-col justify-between border-r border-border bg-card py-6 transition-all duration-300 print:hidden",
        isCollapsed ? "w-18 px-2" : "w-[20%] min-w-[220px] max-w-[280px] px-4"
      )}
    >
      <button
        onClick={toggleCollapse}
        title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="absolute -right-3 top-7 z-30 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-xs transition-colors hover:border-primary/40 hover:text-primary"
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      <div>
        <div className={cn("mb-8 flex items-center gap-2.5", isCollapsed ? "justify-center px-0" : "px-2")}>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-destructive/10">
            <Droplet className="text-destructive" size={20} fill="currentColor" />
          </div>
          {!isCollapsed && (
            <div className="overflow-hidden leading-tight whitespace-nowrap">
              <p className="text-sm font-semibold text-primary-dark">Medora</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Healthcare Platform</p>
            </div>
          )}
        </div>

        <nav className="space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.href}
              {...item}
              isCollapsed={isCollapsed}
              isActive={currentPath === item.href}
            />
          ))}

          {secondaryItems.map((item) => (
            <NavLink
              key={item.href}
              {...item}
              isCollapsed={isCollapsed}
              isActive={currentPath === item.href}
            />
          ))}

          <button
            type="button"
            onClick={logout}
            aria-label="Log out"
            className={cn(
              "group relative mt-2 flex w-full cursor-pointer items-center rounded-lg border-t border-border pt-3 text-sm text-destructive transition-all hover:bg-destructive/10",
              isCollapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2"
            )}
          >
            <LogOut size={18} className="shrink-0" />
            {!isCollapsed && <span className="truncate font-medium">Log out</span>}
            <CollapsedTooltip show={isCollapsed} label="Log out" />
          </button>
        </nav>
      </div>
    </aside>
  );
}
