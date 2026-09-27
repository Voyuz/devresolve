import { getSession } from "@/app/auth/actions";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Home, Tag, CheckCircle2, Bot, Clock } from "lucide-react";
import type { Issue } from "@/types/issues";
import DashboardClient from "./DashboardClient";

async function getStats() {
  const supabase = createAdminClient();
  const { data: issues } = await supabase
    .from("issues")
    .select("id, Status");

  if (!issues) return { total: 0, open: 0, inProgress: 0, resolved: 0 };

  return {
    total: issues.length,
    open: issues.filter((i: Issue) => i.Status === "open" || i.Status === "triaged").length,
    inProgress: issues.filter((i: Issue) => i.Status === "in_progress").length,
    resolved: issues.filter((i: Issue) => i.Status === "resolved").length,
    pendingReview: issues.filter((i: Issue) => i.Status === "ready_for_review").length,
  };
}

async function getRecentIssues() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("issues")
    .select("id, title, Status, CategoryIssues, created_at")
    .order("created_at", { ascending: false })
    .limit(5);
  return (data as Issue[]) ?? [];
}

const statusColor: Record<string, string> = {
  open: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  triaged: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  in_progress: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  ready_for_review: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  resolved: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  needs_human_intervention: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/auth/login");

  const [stats, recentIssues] = await Promise.all([getStats(), getRecentIssues()]);

  return (
    <div className="space-y-8">
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
                <p className={`text-3xl font-bold mt-1 ${s.color}`}>{s.value}</p>
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
            {recentIssues.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No issues yet. <a href="/issues/new" className="underline">Create your first issue</a>.</p>
            ) : (
              <div className="divide-y">
                {recentIssues.map((issue) => (
                  <div key={issue.id} className="flex items-center justify-between py-3">
                    <div className="space-y-0.5">
                      <a href={`/issues/${issue.id}`} className="text-sm font-medium hover:underline">
                        {issue.title ?? "(Untitled)"}
                      </a>
                      <p className="text-xs text-muted-foreground">{issue.CategoryIssues ?? "Uncategorized"}</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor[issue.Status ?? "open"] ?? ""}`}>
                      {issue.Status ?? "open"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* IBM Bob Hackathon Read-Only View */}
        <DashboardClient />
    </div>
  );
}
