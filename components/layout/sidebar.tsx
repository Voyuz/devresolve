"use client";
import React from "react";
import { Home, FolderOpen, ClipboardList, Terminal, Bug, Cpu, Zap } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useBobStatus } from "@/components/layout/use-bob-status";

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (value: boolean) => void;
}

export function Sidebar({ isCollapsed, setIsCollapsed }: SidebarProps) {
  const pathname = usePathname();
  // Real Bob Shell readiness on this server (checked via `bob run --help`, no task started).
  const bob = useBobStatus();
  const bobLabel = !bob ? "Checking..." : !bob.ready ? "Offline" : bob.running ? `Busy · ${bob.running} running` : "Ready";
  const bobDot = !bob ? "bg-zinc-300" : !bob.ready ? "bg-red-400" : bob.running ? "bg-dev-cyan animate-pulse" : "bg-dev-mint";
  const isDevMode = pathname.startsWith("/developer");

  const menuItems = isDevMode
    ? [
        { name: "Dev Overview", icon: Terminal, href: "/developer" },
        { name: "Issues", icon: Bug, href: "/developer/triage" },
        { name: "Bob Resolution", icon: Cpu, href: "/developer/bob-tasks" },
      ]
    : [
        { name: "Dashboard", icon: Home, href: "/dashboard" },
        { name: "Projects", icon: FolderOpen, href: "/projects" },
        { name: "My Issues", icon: ClipboardList, href: "/issues" },
      ];

  return (
    <aside
      className={cn(
        "h-screen bg-white border-r border-zinc-100 flex flex-col fixed left-0 top-0 z-30 transition-all duration-300",
        isCollapsed ? "w-20" : "w-64"
      )}
      onMouseEnter={() => setIsCollapsed(false)}
      onMouseLeave={() => setIsCollapsed(true)}
    >

      <div className={cn("flex items-center gap-2 p-6 mb-4", isCollapsed && "justify-center")}>
        <div className="w-8 h-8 bg-dev-cyan rounded-lg flex-shrink-0 flex items-center justify-center shadow-lg shadow-dev-cyan/20">
          <Zap className="text-white w-5 h-5 fill-current" />
        </div>
        {!isCollapsed && <span className="text-header-main text-dev-slate">DevResolve</span>}
      </div>

      {!isCollapsed && (
        <div className="mb-4 px-8">
          <p className="text-sub-header uppercase tracking-[2px]">
            {isDevMode ? "Developer Mode" : "Reporter Mode"}
          </p>
        </div>
      )}

      <nav className="flex-1 px-4 space-y-2">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link key={item.name} href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group text-body-main",
                isActive ? "bg-dev-cyan/10 text-dev-cyan font-bold" : "text-zinc-500 hover:bg-zinc-50 hover:text-dev-slate",
                isCollapsed && "justify-center"
              )}>
              <item.icon className={cn("w-5 h-5 flex-shrink-0", isActive ? "text-dev-cyan" : "text-zinc-400 group-hover:text-dev-slate")} />
              {!isCollapsed && <span className="truncate">{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 mt-auto">
        <div className={cn("p-4 bg-dev-slate/5 rounded-2xl border border-dev-slate/10 transition-all", isCollapsed ? "flex justify-center" : "block")}>
          {isCollapsed ? (
            <div title={bobLabel} className={cn("w-2 h-2 rounded-full", bobDot)} />
          ) : (
            <>
              <p className="text-badge text-dev-slate mb-1">IBM Bob Agent</p>
              <div className="flex items-center gap-2" title={bob?.reason ?? undefined}>
                <div className={cn("w-2 h-2 rounded-full shrink-0", bobDot)} />
                <p className="text-code text-zinc-500 tracking-tighter uppercase font-bold">{bobLabel}</p>
              </div>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}