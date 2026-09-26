import { getSession } from "@/app/auth/actions";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Issue } from "@/types/issues";

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
    <div className="min-h-screen bg-background">
      <Navbar userName={session.NamaUser} />

      <main className="mx-auto max-w-6xl space-y-8 px-6 py-8">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Overview semua issues di DevResolve</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Card>
            <CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">Total Issues</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-bold">{stats.total}</p></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">Open</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-bold text-blue-600">{stats.open}</p></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">In Progress</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-bold text-purple-600">{stats.inProgress}</p></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">Resolved</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-bold text-green-600">{stats.resolved}</p></CardContent>
          </Card>
        </div>

        {/* Recent Issues */}
        <Card>
          <CardHeader>
            <CardTitle>Issues Terbaru</CardTitle>
          </CardHeader>
          <CardContent>
            {recentIssues.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Belum ada issues. <a href="/issues/new" className="underline">Buat issue pertama</a>.</p>
            ) : (
              <div className="divide-y">
                {recentIssues.map((issue) => (
                  <div key={issue.id} className="flex items-center justify-between py-3">
                    <div className="space-y-0.5">
                      <a href={`/issues/${issue.id}`} className="text-sm font-medium hover:underline">
                        {issue.title ?? "(Tanpa judul)"}
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
      </main>
    </div>
  );
}
