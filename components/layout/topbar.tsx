"use client";
import { Bell, UserCircle, ArrowRightLeft, LayoutGrid } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

export function TopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const isDevMode = pathname.startsWith("/developer");

  return (
    <header className="h-20 bg-white/80 backdrop-blur-md flex items-center justify-between px-8 sticky top-0 z-10 border-b border-zinc-50">
      <div className="flex items-center gap-2">
        <LayoutGrid className="w-4 h-4 text-zinc-400" />
        <span className="text-zinc-300">/</span>
        <h2 className="text-body-main text-dev-slate font-bold capitalize">
          {pathname.split("/").filter(Boolean).join(" / ") || "Main Workspace"}
        </h2>
      </div>

      <div className="flex items-center gap-6">
        <button 
          onClick={() => router.push(isDevMode ? "/dashboard" : "/developer")}
          className="flex items-center gap-2 px-4 py-2 rounded-full border border-dev-terracotta/30 text-dev-terracotta text-action hover:bg-dev-terracotta/5 transition-all"
        >
          <ArrowRightLeft className="w-3 h-3" />
          Switch to {isDevMode ? "User" : "Dev"} Mode
        </button>

        <div className="flex items-center gap-4 pl-6 border-l border-zinc-100 font-inter">
          <Bell size={18} className="text-zinc-400 cursor-pointer hover:text-dev-cyan" />
          <div className="flex items-center gap-3">
            <div className="text-right leading-none">
              <p className="text-action text-dev-slate">Rangga Pratama</p>
              <p className="text-[10px] text-zinc-400 font-medium">QA Tester</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-zinc-100 border-2 border-dev-sand flex items-center justify-center">
              <UserCircle className="w-6 h-6 text-zinc-400" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}