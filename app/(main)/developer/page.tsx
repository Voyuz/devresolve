"use client";

import React from "react";
import {
  CheckCircle2,
  AlertTriangle,
  Cpu,
  Clock,
  GitMerge,
  Activity,
  BarChart3,
  Users,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

// --- MOCK DATA ---
const projectHealth = [
  { name: "finpay-api", client: "FinTech Indo Ltd.", openIssues: 3, resolved: 14, inProgress: 1, health: "warning" },
  { name: "minishop-ecommerce", client: "E-Commerce Prime", openIssues: 1, resolved: 9, inProgress: 2, health: "good" },
  { name: "fleet-track", client: "Logistics Corp", openIssues: 4, resolved: 6, inProgress: 1, health: "critical" },
  { name: "frontend-web", client: "Internal QA", openIssues: 2, resolved: 20, inProgress: 0, health: "good" },
  { name: "reporting-service", client: "Startup X", openIssues: 0, resolved: 5, inProgress: 0, health: "good" },
];

const recentActivity = [
  { time: "2m ago", event: "Bob AI resolved ISS-105 (Export CSV format)", type: "resolved" },
  { time: "1h ago", event: "ISS-088 assigned to Bob AI — Logistics Corp", type: "assigned" },
  { time: "2h ago", event: "Developer accepted fix for ISS-092 — FinTech Indo", type: "accepted" },
  { time: "4h ago", event: "ISS-094 fix generated — awaiting review", type: "pending" },
  { time: "Yesterday", event: "ISS-102 reported by Internal QA", type: "new" },
];

const stats = [
  { label: "Total Open Issues", value: 10, icon: AlertTriangle, color: "text-[#ce8f5a]", border: "border-[#ce8f5a]/30", bg: "bg-[#ce8f5a]/5" },
  { label: "In Progress (Bob AI)", value: 4, icon: Cpu, color: "text-[#5ec0ca]", border: "border-[#5ec0ca]/30", bg: "bg-[#5ec0ca]/5" },
  { label: "Resolved This Week", value: 7, icon: CheckCircle2, color: "text-[#80c8bc]", border: "border-[#80c8bc]/30", bg: "bg-[#80c8bc]/5" },
  { label: "Active Projects", value: 5, icon: BarChart3, color: "text-[#6287a2]", border: "border-[#6287a2]/30", bg: "bg-[#6287a2]/5" },
];

function HealthDot({ health }: { health: string }) {
  if (health === "good") return <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2c7a6e]"><span className="w-2 h-2 rounded-full bg-[#80c8bc]" />Healthy</span>;
  if (health === "warning") return <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#b87643]"><span className="w-2 h-2 rounded-full bg-[#ce8f5a]" />Warning</span>;
  return <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-500"><span className="w-2 h-2 rounded-full bg-red-400" />Critical</span>;
}

function ActivityDot({ type }: { type: string }) {
  const map: Record<string, string> = {
    resolved: "bg-[#80c8bc]",
    assigned: "bg-[#5ec0ca]",
    accepted: "bg-[#6287a2]",
    pending: "bg-[#ce8f5a]",
    new: "bg-slate-400",
  };
  return <span className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${map[type] ?? "bg-slate-300"}`} />;
}

export default function DevOverviewPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#6287a2] flex items-center gap-2">
            <Activity className="text-[#5ec0ca] w-6 h-6" />
            Developer Overview
          </h1>
          <p className="text-sm text-slate-500 mt-1">Read-only snapshot of project & AI pipeline health</p>
        </div>
        <Badge variant="outline" className="border-[#80c8bc]/50 text-[#2c7a6e] bg-[#80c8bc]/10 text-xs font-semibold gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5" /> Read-Only View
        </Badge>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className={`border ${s.border} ${s.bg} rounded-xl p-5 flex items-center justify-between`}>
            <div>
              <p className="text-slate-500 text-sm font-medium">{s.label}</p>
              <p className={`text-3xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            </div>
            <div className="p-3 bg-white/60 rounded-lg border border-white/80">
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Project Health Table */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-base font-bold text-[#6287a2] flex items-center gap-2">
              <GitMerge className="w-4 h-4 text-[#5ec0ca]" /> Project Health
            </h2>
            <span className="text-xs text-slate-400">{projectHealth.length} projects</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs text-slate-400 uppercase font-bold border-b border-slate-100">
                  <th className="px-5 py-3 text-left">Repository</th>
                  <th className="px-5 py-3 text-center">Open</th>
                  <th className="px-5 py-3 text-center">In Progress</th>
                  <th className="px-5 py-3 text-center">Resolved</th>
                  <th className="px-5 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {projectHealth.map((p) => (
                  <tr key={p.name} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-slate-700 font-mono text-xs">{p.name}</p>
                      <p className="text-slate-400 text-xs mt-0.5">{p.client}</p>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`font-bold ${p.openIssues > 2 ? "text-[#ce8f5a]" : "text-slate-600"}`}>{p.openIssues}</span>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className="font-bold text-[#5ec0ca]">{p.inProgress}</span>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className="font-bold text-[#80c8bc]">{p.resolved}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <HealthDot health={p.health} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#5ec0ca]" />
            <h2 className="text-base font-bold text-[#6287a2]">Recent Activity</h2>
          </div>
          <div className="p-5 space-y-4">
            {recentActivity.map((a, i) => (
              <div key={i} className="flex items-start gap-3">
                <ActivityDot type={a.type} />
                <div>
                  <p className="text-sm text-slate-700 leading-snug">{a.event}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{a.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bob AI Summary */}
      <div className="bg-[#5ec0ca]/5 border border-[#5ec0ca]/20 rounded-xl p-5 flex items-start gap-4">
        <div className="p-2.5 bg-white rounded-full border border-[#5ec0ca]/20 shrink-0">
          <Cpu className="w-5 h-5 text-[#5ec0ca]" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-[#449199] mb-1">IBM Bob AI Agent — Pipeline Summary</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Bob AI is currently processing <strong>4 active tasks</strong> across 3 projects. 
            2 fixes are awaiting developer review. Average resolution time this week: <strong>1h 24m</strong>.
          </p>
        </div>
      </div>
    </div>
  );
}