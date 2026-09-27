"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Home, Tag, CheckCircle2, Bot, Clock } from "lucide-react";
import { useWorkspace } from "@/components/layout/use-workspace";
import { stateOf } from "@/components/layout/workspace-metrics";
import { formatDateTime } from "@/lib/utils";
import DashboardClient from "./DashboardClient";

// Layout from main; data from the signed-in user's workspace (reporters see their own projects, developers all).

const STATE_LABEL: Record<string, { label: string; className: string }> = {
  OPEN: { label: "Open", className: "bg-blue-100 text-blue-700" },
  IN_PROGRESS: { label: "In progress", className: "bg-purple-100 text-purple-700" },
  PENDING_REVIEW: { label: "Awaiting review", className: "bg-orange-100 text-orange-700" },
  RESOLVED: { label: "Resolved", className: "bg-green-100 text-green-700" },
};

export default function DashboardPage() {
  const workspace = useWorkspace();
  const states = workspace.issues.map(issue => ({ issue, state: stateOf(issue, workspace.jobs) }));
  const count = (state: string) => states.filter(entry => entry.state === state).length;
  const stats = { total: states.length, resolved: count("RESOLVED"), inProgress: count("IN_PROGRESS"), pendingReview: count("PENDING_REVIEW") };
  const recentIssues = [...states].sort((a, b) => b.issue.created_at.localeCompare(a.issue.created_at)).slice(0, 5);

  return (
    <div className="space-y-8">
      {workspace.error && <p role="alert" className="text-red-600">{workspace.error}</p>}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#6287a2] flex items-center gap-2">
            <Home className="text-[#5ec0ca] w-6 h-6" />
            Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-1">A comprehensive overview of system issues and resolution progress.</p>
        </div>
      </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Reported",   value: stats.total,         color: "text-[#6287a2]", border: "border-[#6287a2]/30", bg: "bg-[#6287a2]/5",  icon: Tag },
            { label: "Resolved",         value: stats.resolved,      color: "text-[#80c8bc]", border: "border-[#80c8bc]/30", bg: "bg-[#80c8bc]/5",  icon: CheckCircle2 },
            { label: "In Progress",      value: stats.inProgress,    color: "text-[#5ec0ca]", border: "border-[#5ec0ca]/30", bg: "bg-[#5ec0ca]/5",  icon: Bot },
            { label: "Awaiting Review",  value: stats.pendingReview, color: "text-[#b87643]", border: "border-[#ce8f5a]/30", bg: "bg-[#ce8f5a]/5",  icon: Clock },
          ].map((s) => (
            <div
              key={s.label}
              className={`border ${s.border} ${s.bg} rounded-xl p-5 flex items-center justify-between`}
            >
              <div>
                <p className="text-slate-500 text-sm font-medium">{s.label}</p>
                <p className={`text-3xl font-bold mt-1 ${s.color}`}>{workspace.loading ? "…" : s.value}</p>
              </div>
              <div className="p-3 bg-white/60 rounded-lg border border-white/80">
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
            </div>
          ))}
        </div>

        {/* Recent Issues */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Issues</CardTitle>
          </CardHeader>
          <CardContent>
            {workspace.loading ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Loading issues...</p>
            ) : recentIssues.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No issues yet. <Link href="/projects" className="underline">Create your first issue</Link>.</p>
            ) : (
              <div className="divide-y">
                {recentIssues.map(({ issue, state }) => (
                  <div key={issue.id} className="flex items-center justify-between py-3">
                    <div className="space-y-0.5">
                      <Link href={`/issues/${issue.id}`} className="text-sm font-medium hover:underline">
                        {issue.title || "(Untitled)"}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {issue.CategoryIssues || "Uncategorized"} · {formatDateTime(issue.created_at)}
                      </p>
                    </div>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATE_LABEL[state]?.className ?? ""}`}>
                      {STATE_LABEL[state]?.label ?? state}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <DashboardClient workspace={workspace} />
    </div>
  );
}
