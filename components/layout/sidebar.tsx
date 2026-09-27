"use client";
import React from "react";
import { Home, FolderOpen, ClipboardList, Bug, Cpu, Zap, UserPlus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (value: boolean) => void;
  /** Open issues assigned to the signed-in developer, shown on the "Issues" menu item. */
  assignedToMe?: number;
}

export function Sidebar({ isCollapsed, setIsCollapsed, assignedToMe = 0 }: SidebarProps) {
  const pathname = usePathname();
  const isDevMode = pathname.startsWith("/developer");

  const menuItems = isDevMode
    ? [
        { name: "Dashboard", icon: Home, href: "/developer" },
        { name: "Issues", icon: Bug, href: "/developer/triage" },
        { name: "Bob Resolution", icon: Cpu, href: "/developer/bob-tasks" },
        { name: "Bob Setup", icon: Zap, href: "/developer/setup" },
        { name: "Register User", icon: UserPlus, href: "/developer/users/new" },
      ]
    : [
        { name: "Dashboard", icon: Home, href: "/dashboard" },
        { name: "Projects", icon: FolderOpen, href: "/projects" },
        { name: "My Issues", icon: ClipboardList, href: "/issues" },
      ];

  return (
    <aside
      className={cn(
        "h-screen bg-white flex flex-col fixed left-0 top-0 z-30 transition-all duration-300",
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
            {isDevMode ? "Developer Mode" : "User Mode"}
          </p>
        </div>
      )}

      <nav className="flex-1 px-4 space-y-2">
        {menuItems.map((item) => {
          const isActive = pathname === item.href || (item.href === "/developer/triage" && pathname.startsWith("/developer/issues/"));
          const badge = item.href === "/developer/triage" ? assignedToMe : 0;
          return (
            <Link key={item.name} href={item.href}
              title={badge ? `${badge} issue${badge > 1 ? "s" : ""} assigned to you` : undefined}
              className={cn(
                "relative flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group text-body-main",
                isActive ? "bg-dev-cyan/10 text-dev-cyan font-bold" : "text-zinc-500 hover:bg-zinc-50 hover:text-dev-slate",
                isCollapsed && "justify-center"
              )}>
              <item.icon className={cn("w-5 h-5 flex-shrink-0", isActive ? "text-dev-cyan" : "text-zinc-400 group-hover:text-dev-slate")} />
              {!isCollapsed && <span className="truncate">{item.name}</span>}
              {badge > 0 && (
                <span className={cn("min-w-5 h-5 px-1.5 rounded-full bg-[#6287a2] text-white text-[11px] font-bold flex items-center justify-center",
                  isCollapsed ? "absolute top-1 right-2" : "ml-auto")}>
                  {badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

    </aside>
  );
}
