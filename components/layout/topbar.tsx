"use client";
import { Bell, UserCircle, LogOut, ArrowRightLeft } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { signOut, getSession } from "@/app/auth/actions";
import { useEffect, useState } from "react";
import type { SessionUser } from "@/types/issues";
import { ThemeToggle } from "@/components/theme-toggle";
import { useBobStatus } from "@/components/layout/use-bob-status";

export function TopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const isDeveloper = user?.role === "developer";
  const inDeveloperView = pathname.startsWith("/developer");
  // Developer to-dos: fixes awaiting review and untriaged reports.
  const bob = useBobStatus();
  const pending = bob ? bob.awaitingReview + bob.untriaged : 0;
  const pendingTitle = bob ? `${bob.awaitingReview} fix(es) awaiting review · ${bob.untriaged} untriaged report(s)` : "Loading notifications";

  useEffect(() => {
    getSession().then(setUser);
  }, []);

  return (
    <header className="h-20 bg-white/80 backdrop-blur-md flex items-center justify-end px-8 sticky top-0 z-10 border-b border-zinc-50">

      <div className="flex items-center gap-6">
        <ThemeToggle />
        {/* Developers can also use the reporter pages (issue detail, projects, reporting); reporters never see this. */}
        {isDeveloper && (
          <button
            type="button"
            onClick={() => router.push(inDeveloperView ? "/dashboard" : "/developer")}
            className="flex items-center gap-2 px-4 py-2 rounded-full border border-dev-terracotta/30 text-dev-terracotta text-action hover:bg-dev-terracotta/5 transition-all"
          >
            <ArrowRightLeft className="w-3 h-3" />
            {inDeveloperView ? "Reporter view" : "Developer view"}
          </button>
        )}
        <div className="flex items-center gap-4 pl-6 border-zinc-100 font-inter">
          {isDeveloper && (
            <button type="button" title={pendingTitle} aria-label={pendingTitle}
              onClick={() => router.push(bob?.awaitingReview ? "/developer/bob-tasks" : "/developer/triage")}
              className="relative text-zinc-400 hover:text-dev-cyan">
              <Bell size={18} />
              {pending > 0 && (
                <span className="absolute -top-1.5 -right-2 min-w-4 h-4 px-1 rounded-full bg-dev-terracotta text-white text-[10px] font-bold leading-4 text-center">
                  {pending > 99 ? "99+" : pending}
                </span>
              )}
            </button>
          )}
          <div className="flex items-center gap-3">
            <div className="text-right leading-none">
              <p className="text-action text-dev-slate capitalize">
                {user ? user.NamaUser : "Loading..."}
              </p>
              <p className="text-[10px] text-zinc-400 font-medium capitalize">
                {user ? user.role : "..."}
              </p>
            </div>
            <div className="w-9 h-9 rounded-full bg-zinc-100 border-2 border-dev-sand flex items-center justify-center">
              <UserCircle className="w-6 h-6 text-zinc-400" />
            </div>
            <form action={signOut}>
              <button
                type="submit"
                className="w-9 h-9 rounded-full bg-zinc-100 flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-colors text-zinc-400 ml-1"
                title="Log Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </header>
  );
}
