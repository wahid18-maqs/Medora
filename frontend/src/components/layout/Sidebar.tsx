"use client";

import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  History,
  HeartPulse,
  Bot,
  Settings,
  HelpCircle,
  Droplet,
  ChevronDown,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface SidebarProps {
  activeHref?: string;
  onToggleChat?: () => void;
  isChatOpen?: boolean;
}

export default function Sidebar({
  activeHref = "/dashboard",
  onToggleChat,
  isChatOpen = false,
}: SidebarProps) {
  const { user, logout } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Remember collapsed preference
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

  return (
    <aside
      className={cn(
        "bg-card border-r border-border flex flex-col justify-between py-6 transition-all duration-300 relative select-none shrink-0",
        isCollapsed ? "w-18 px-2" : "w-[20%] min-w-[220px] max-w-[280px] px-4"
      )}
    >
      {/* Toggle collapse button */}
      <button
        onClick={toggleCollapse}
        title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="absolute -right-3 top-7 w-6 h-6 rounded-full bg-card border border-border text-muted-foreground hover:text-primary hover:border-primary/40 flex items-center justify-center shadow-xs transition-colors z-30 cursor-pointer"
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      <div>
        {/* Brand Header */}
        <div className={cn("flex items-center gap-2.5 mb-8", isCollapsed ? "justify-center px-0" : "px-2")}>
          <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
            <Droplet className="text-destructive" size={20} fill="currentColor" />
          </div>
          {!isCollapsed && (
            <div className="leading-tight overflow-hidden whitespace-nowrap">
              <p className="font-semibold text-primary-dark text-sm">Medora</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">Healthcare Platform</p>
            </div>
          )}
        </div>

        {/* Navigation list */}
        <nav className="space-y-1">
          {/* 1. Dashboard */}
          <a
            href="/dashboard"
            title={isCollapsed ? "Dashboard" : undefined}
            className={cn(
              "flex items-center rounded-lg text-sm transition-all",
              isCollapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2",
              activeHref === "/dashboard"
                ? "bg-primary text-primary-foreground font-medium"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <LayoutDashboard size={18} className="shrink-0" />
            {!isCollapsed && <span className="truncate">Dashboard</span>}
          </a>

          {/* 2. Reports History */}
          <a
            href="/dashboard/history"
            title={isCollapsed ? "Reports History" : undefined}
            className={cn(
              "flex items-center rounded-lg text-sm transition-all",
              isCollapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2",
              activeHref === "/dashboard/history"
                ? "bg-primary text-primary-foreground font-medium"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <History size={18} className="shrink-0" />
            {!isCollapsed && <span className="truncate">Reports History</span>}
          </a>

          {/* 3. Health Profile */}
          <a
            href="/dashboard/profile"
            title={isCollapsed ? "Health Profile" : undefined}
            className={cn(
              "flex items-center rounded-lg text-sm transition-all",
              isCollapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2",
              activeHref === "/dashboard/profile"
                ? "bg-primary text-primary-foreground font-medium"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <HeartPulse size={18} className="shrink-0" />
            {!isCollapsed && <span className="truncate">Health Profile</span>}
          </a>

          {/* 4. AI Assistant (after Health Profile, before Settings) */}
          <button
            type="button"
            onClick={onToggleChat}
            title={isCollapsed ? "AI Assistant" : undefined}
            className={cn(
              "w-full flex items-center rounded-lg text-sm transition-all cursor-pointer text-left",
              isCollapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2",
              isChatOpen
                ? "bg-primary text-primary-foreground font-medium shadow-xs"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Bot size={18} className="shrink-0" />
            {!isCollapsed && (
              <div className="flex-1 flex items-center justify-between">
                <span className="truncate">AI Assistant</span>
                <span
                  className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded font-medium",
                    isChatOpen ? "bg-primary-foreground/20 text-primary-foreground" : "bg-primary/10 text-primary"
                  )}
                >
                  Q&A
                </span>
              </div>
            )}
          </button>

          {/* 5. Settings */}
          <a
            href="/dashboard/settings"
            title={isCollapsed ? "Settings" : undefined}
            className={cn(
              "flex items-center rounded-lg text-sm transition-all",
              isCollapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2",
              activeHref === "/dashboard/settings"
                ? "bg-primary text-primary-foreground font-medium"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Settings size={18} className="shrink-0" />
            {!isCollapsed && <span className="truncate">Settings</span>}
          </a>

          {/* 6. Support */}
          <a
            href="/dashboard/support"
            title={isCollapsed ? "Support" : undefined}
            className={cn(
              "flex items-center rounded-lg text-sm transition-all",
              isCollapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2",
              activeHref === "/dashboard/support"
                ? "bg-primary text-primary-foreground font-medium"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <HelpCircle size={18} className="shrink-0" />
            {!isCollapsed && <span className="truncate">Support</span>}
          </a>

          {/* 7. Log out */}
          <button
            type="button"
            onClick={logout}
            title={isCollapsed ? "Log out" : undefined}
            className={cn(
              "w-full flex items-center rounded-lg text-sm transition-all text-destructive hover:bg-destructive/10 cursor-pointer pt-3 mt-2 border-t border-border",
              isCollapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2"
            )}
          >
            <LogOut size={18} className="shrink-0" />
            {!isCollapsed && <span className="truncate font-medium">Log out</span>}
          </button>
        </nav>
      </div>
    </aside>
  );
}

