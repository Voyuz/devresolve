"use client";

import React from "react";
import {
  Activity,
  AlertTriangle,
  Bot,
  CheckCircle2,
  BarChart3,
  Eye,
  FolderOpen,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useWorkspace, issueStatus } from "@/components/layout/use-workspace";
import { Badge } from "@/components/ui/badge";

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max === 0 ? 0 : Math.round((value / max) * 100);
  return (
    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
      <div
        className="h-1.5 rounded-full bg-[#5ec0ca] transition-all"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export default function DashboardClient() {
  const workspace = useWorkspace();
  const PROJECTS_DATA = workspace.projects.map(project => {
    const issues = workspace.issues.filter(issue => issue.ProjekId === project.id);
    return { id: project.id, name: project.name, status: "REGISTERED", urgency: "LOW",
      stats: { total: issues.length, critical: 0, resolved: issues.filter(issue => issueStatus(workspace.jobs.find(job => job.issue_id === issue.id), issue.Status) === "RESOLVED").length,
        inProgress: issues.filter(issue => issueStatus(workspace.jobs.find(job => job.issue_id === issue.id), issue.Status) === "IN_PROGRESS").length } };
  });
  const totals = PROJECTS_DATA.reduce(
    (acc, p) => ({
      total:      acc.total      + p.stats.total,
      critical:   acc.critical   + p.stats.critical,
      resolved:   acc.resolved   + p.stats.resolved,
      inProgress: acc.inProgress + p.stats.inProgress,
    }),
    { total: 0, critical: 0, resolved: 0, inProgress: 0 }
  );

  const resolvedPct = totals.total ? Math.round((totals.resolved / totals.total) * 100) : 0;
  const openIssues  = totals.total - totals.resolved;

  const stats = [
    { label: "Total Open Issues",   value: openIssues,          icon: AlertTriangle, color: "text-[#ce8f5a]", border: "border-[#ce8f5a]/30", bg: "bg-[#ce8f5a]/5" },
    { label: "In Progress (Bob AI)", value: totals.inProgress,  icon: Bot,           color: "text-[#5ec0ca]", border: "border-[#5ec0ca]/30", bg: "bg-[#5ec0ca]/5" },
    { label: "Resolved Reports",  value: totals.resolved,     icon: CheckCircle2,  color: "text-[#80c8bc]", border: "border-[#80c8bc]/30", bg: "bg-[#80c8bc]/5" },
    { label: "Active Projects",     value: PROJECTS_DATA.length, icon: BarChart3,    color: "text-[#6287a2]", border: "border-[#6287a2]/30", bg: "bg-[#6287a2]/5" },
  ];

  return (
    <div className="space-y-8">
      {workspace.error && <p role="alert" className="text-red-600">{workspace.error}</p>}
      {workspace.loading && <p>Loading dashboard...</p>}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#6287a2] flex items-center gap-2">
            <Activity className="text-[#5ec0ca] w-6 h-6" />
            Project Overview
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Read-only snapshot of project &amp; AI pipeline health
          </p>
        </div>
        <Badge
          variant="outline"
          className="border-[#80c8bc]/50 text-[#2c7a6e] bg-[#80c8bc]/10 text-xs font-semibold gap-1.5"
        >
          <Eye className="w-3.5 h-3.5" /> Read-Only View
        </Badge>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className={`border ${s.border} ${s.bg} rounded-xl p-5 flex items-center justify-between`}
          >
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

      <div className="bg-white border border-slate-200 rounded-xl px-5 py-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#5ec0ca]" />
            <span className="text-sm font-bold text-[#6287a2] uppercase tracking-widest">
              Overall Resolution Progress
            </span>
          </div>
          <span className="text-lg font-bold text-[#5ec0ca]">{resolvedPct}%</span>
        </div>
        <ProgressBar value={totals.resolved} max={totals.total} />
        <p className="text-xs text-slate-400 mt-2">
          {totals.resolved} resolved &nbsp;·&nbsp; {openIssues} open &nbsp;·&nbsp; {totals.total} total
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-[#6287a2] flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-[#5ec0ca]" /> Project Breakdown
          </h2>
          <span className="text-xs text-slate-400">{PROJECTS_DATA.length} projects</span>
        </div>

        <div className="divide-y divide-slate-50">
          {PROJECTS_DATA.map((project) => {
            const pct = project.stats.total ? Math.round((project.stats.resolved / project.stats.total) * 100) : 0;
            const urgencyStyle =
              project.urgency === "CRITICAL"
                ? "bg-red-50 text-red-500 border border-red-100"
                : project.urgency === "HIGH"
                ? "bg-orange-50 text-orange-500 border border-orange-100"
                : "bg-slate-50 text-slate-400 border border-slate-100";

            return (
              <div key={project.id} className="px-5 py-4 hover:bg-slate-50/60 transition-colors">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold font-mono bg-slate-50 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-md">
                      {project.id}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${urgencyStyle}`}>
                      {project.urgency}
                    </span>
                    <span className="text-sm font-semibold text-slate-700">{project.name}</span>
                  </div>
                  <span className="text-sm font-bold text-slate-300">{pct}%</span>
                </div>

                <ProgressBar value={project.stats.resolved} max={project.stats.total} />

                <div className="flex gap-5 mt-2.5 text-xs text-slate-400">
                  <span><span className="font-bold text-slate-600">{project.stats.total}</span> total</span>
                  <span><span className="font-bold text-[#ce8f5a]">{project.stats.critical}</span> critical</span>
                  <span><span className="font-bold text-[#5ec0ca]">{project.stats.inProgress}</span> in progress</span>
                  <span><span className="font-bold text-[#80c8bc]">{project.stats.resolved}</span> resolved</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="pt-4 border-t border-slate-100 flex items-center gap-2 text-[10px] text-slate-300 font-medium uppercase tracking-widest">
        <Zap className="w-3 h-3 text-[#5ec0ca]" />
        DevResolve · AI-Powered Issue Resolution Pipeline · IBM Bob 2.0 Hackathon
      </div>
    </div>
  );
}
