"use client";

import React from "react";
import {
  CheckCircle2,
  AlertTriangle,
  Cpu,
  Clock,
  GitMerge,
  Activity,
  Home,
  BarChart3,
  ShieldCheck,
} from "lucide-react";
import { useWorkspace, issueStatus } from "@/components/layout/use-workspace";
import { Badge } from "@/components/ui/badge";

function HealthDot({ health }: { health: string }) {
  if (health === "unknown") return <span className="text-xs text-slate-400">Not monitored</span>;
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
  const workspace = useWorkspace();
  const projectHealth = workspace.projects.map(project => {
    const issues = workspace.issues.filter(issue => issue.ProjekId === project.id);
    return { name: project.name, client: project.id, resolved: issues.filter(issue => issueStatus(workspace.jobs.find(job => job.issue_id === issue.id), issue.Status) === "RESOLVED").length,
      openIssues: issues.filter(issue => issueStatus(workspace.jobs.find(job => job.issue_id === issue.id), issue.Status) === "OPEN").length,
      inProgress: issues.filter(issue => issueStatus(workspace.jobs.find(job => job.issue_id === issue.id), issue.Status) === "IN_PROGRESS").length,
      health: "unknown" };
  });
  const recentActivity = workspace.jobs.slice(0, 5).map(job => ({ time: new Date(job.created_at).toLocaleString(), event: "Issue #" + job.issue_id + ": " + (job.review_status || job.status), type: job.review_status === "APPROVED" ? "accepted" : "pending" }));
const stats = [
  { label: "Total Open Issues", value: projectHealth.reduce((total, project) => total + project.openIssues, 0), icon: AlertTriangle, color: "text-[#ce8f5a]", border: "border-[#ce8f5a]/30", bg: "bg-[#ce8f5a]/5" },
  { label: "In Progress (Bob AI)", value: projectHealth.reduce((total, project) => total + project.inProgress, 0), icon: Cpu, color: "text-[#5ec0ca]", border: "border-[#5ec0ca]/30", bg: "bg-[#5ec0ca]/5" },
  { label: "Published Fixes", value: workspace.jobs.filter(job => job.review_status === "APPROVED").length, icon: CheckCircle2, color: "text-[#80c8bc]", border: "border-[#80c8bc]/30", bg: "bg-[#80c8bc]/5" },
  { label: "Active Projects", value: workspace.projects.length, icon: BarChart3, color: "text-[#6287a2]", border: "border-[#6287a2]/30", bg: "bg-[#6287a2]/5" },
];



  return (
    <div className="space-y-8">
      {workspace.error && <p role="alert" className="text-red-600">{workspace.error}</p>}
      {workspace.loading && <p>Loading developer overview...</p>}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#6287a2] flex items-center gap-2">
            <Home className="text-[#5ec0ca] w-6 h-6" />
            Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-1">Monitor the overall health and status of active projects.</p>
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
          <h3 className="text-sm font-bold text-[#449199] mb-1">AI Agent — Pipeline Summary</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Bob has <strong>{workspace.jobs.filter(job => ["QUEUED", "CLONING", "INVESTIGATING", "FIXING", "VALIDATING"].includes(job.status)).length} active jobs</strong>.
            {" "}{workspace.jobs.filter(job => job.status === "READY_FOR_REVIEW" && job.review_status === "PENDING").length} fixes are awaiting developer review.
          </p>
        </div>
      </div>
    </div>
  );
}