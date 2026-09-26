"use client";
import React, { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/topbar";

export default function MainDashboardLayout({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(true);

  return (
    <div className="flex min-h-screen bg-[#fcfcfd]">
      {/* Sidebar - Always Present */}
      <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />

      {/* Content Area - Adjusts margin when sidebar collapses */}
      <div
        className="flex-1 flex flex-col transition-all duration-300 ease-in-out"
        style={{ paddingLeft: isCollapsed ? "80px" : "256px" }}
      >
        <TopBar />
        <main className="p-8">
          {children}
        </main>
      </div>
    </div>
  );
}