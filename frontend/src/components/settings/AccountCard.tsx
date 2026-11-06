"use client";

import { useAuth } from "@/hooks/useAuth";
import { User, LogOut } from "lucide-react";

export default function AccountCard() {
  const { user, logout } = useAuth();

  return (
    <section className="py-6 first:pt-0">
      <div className="mb-5">
        <h2 className="text-base font-semibold text-foreground">Account</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Your signed-in patient profile.
        </p>
      </div>

      <div className="flex items-center justify-between gap-4 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-foreground">
            {user?.name?.[0] || <User size={18} />}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">
              {user?.name || "User"}
            </p>
            <p className="truncate text-sm text-muted-foreground">
              {user?.email || "user@example.com"}
            </p>
          </div>
        </div>

        <button
          onClick={logout}
          className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted"
        >
          <LogOut size={14} />
          Log out
        </button>
      </div>
    </section>
  );
}
