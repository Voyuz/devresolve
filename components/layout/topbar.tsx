"use client";
import { Bell, UserCircle, LayoutGrid, LogOut } from "lucide-react";
import { usePathname } from "next/navigation";
import { signOut, getSession } from "@/app/auth/actions";
import { useEffect, useState } from "react";
import type { SessionUser } from "@/types/issues";

export function TopBar() {
  const pathname = usePathname();
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    getSession().then(setUser);
  }, []);

  return (
    <header className="h-20 bg-white/80 backdrop-blur-md flex items-center justify-end px-8 sticky top-0 z-10 border-b border-zinc-50">

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-4 pl-6 border-zinc-100 font-inter">
          <Bell size={18} className="text-zinc-400 cursor-pointer hover:text-dev-cyan" />
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
