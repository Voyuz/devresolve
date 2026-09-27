"use client";
import React, { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/topbar";
import { useBobStatus } from "@/components/layout/use-bob-status";

export default function MainDashboardLayout({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const bob = useBobStatus();

  return (
    <div className="flex min-h-screen bg-slate-100">
      {/* Sidebar - Always Present */}
      <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} assignedToMe={bob?.assignedToMe ?? 0} />

      {/* Content Area - Adjusts margin when sidebar collapses; min-w-0 keeps wide content (long diff lines) scrolling inside its box instead of widening the page */}
      <div
        className="flex-1 min-w-0 flex flex-col transition-all duration-300 ease-in-out"
        style={{ paddingLeft: isCollapsed ? "80px" : "256px" }}
      >
        <TopBar bob={bob} />
        <main className="p-8">
          {children}
        </main>
      </div>
    </div>
  );
}