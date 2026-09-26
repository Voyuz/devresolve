import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { BobIssue, BobProject } from "@/types/bob";

export async function normalizedIssueSchema() {
  const { error } = await createSupabaseServerClient().from("issues").select("project_id").limit(0);
  if (!error) return true;
  if (error.code === "42703" || error.code === "PGRST204") return false;
  throw new Error("Cannot inspect issue schema. Check Supabase configuration.");
}

export async function listIssues() {
  const normalized = await normalizedIssueSchema();
  const { data, error } = await createSupabaseServerClient().from("issues")
    .select(normalized ? "id::text,created_at,project_id::text,reporter_id,title,description,category_issues,status,severity,priority,expected_behavior" : 'id::text,created_at,ProjekId,ReporterId,title,description,CategoryIssues,Status,expected_behavior,screenshot_ref').order("id", { ascending: false });
  if (error) throw new Error("Cannot load issues. Check Supabase configuration and migration.");
  const rows = (data ?? []) as unknown as Record<string, unknown>[];
  return rows.map(row => normalized ? { id: row.id, created_at: row.created_at,
    ProjekId: row.project_id, ReporterId: row.reporter_id, title: row.title, description: row.description,
    CategoryIssues: row.category_issues, Status: row.status, expected_behavior: row.expected_behavior,
    screenshot_ref: null, severity: row.severity, priority: row.priority } : row);
}
export async function saveIssue(project: BobProject, issue: BobIssue) {
  const normalized = await normalizedIssueSchema();
  const values: Record<string, string | null> = normalized ? {
    project_id: project.id, reporter_id: process.env.DEVRESOLVE_DEMO_REPORTER_ID || "demo",
    title: issue.title, description: issue.description + (issue.screenshotRef ? "\n\nAttachment metadata: " + issue.screenshotRef : ""),
    category_issues: "BUG", status: "reported", expected_behavior: issue.expectedBehavior ?? null,
  } : {
    ProjekId: project.id, ReporterId: process.env.DEVRESOLVE_DEMO_REPORTER_ID || "demo",
    title: issue.title, description: issue.description, CategoryIssues: "BUG", Status: "OPEN",
    expected_behavior: issue.expectedBehavior ?? null, screenshot_ref: issue.screenshotRef ?? null,
  };
  const { data, error } = await createSupabaseServerClient().from("issues").insert(values).select("id::text").single();
  if (error || !data) throw new Error("Cannot save issue. Check required fields and docs/supabase-bob.sql.");
  return data.id as string;
}
export async function getIssue(id: string) {
  const normalized = await normalizedIssueSchema();
  const { data, error } = await createSupabaseServerClient().from("issues")
    .select(normalized ? "id::text,project_id::text,title,description,expected_behavior" : "id::text,ProjekId,title,description,expected_behavior,screenshot_ref").eq("id", id).maybeSingle();
  if (error) throw new Error("Cannot load issue.");
  if (!data) return null;
  const row = data as unknown as Record<string, string | null>;
  return { projectId: (normalized ? row.project_id : row.ProjekId)!, issue: {
    title: row.title!, description: row.description!,
    expectedBehavior: row.expected_behavior ?? undefined, screenshotRef: row.screenshot_ref ?? undefined,
  } satisfies BobIssue };
}
export async function createExistingIssueJob(project: BobProject, issueId: string) {
  const db = createSupabaseServerClient();
  const { data: active, error: lookupError } = await db.from("bob_jobs").select("id")
    .eq("issue_id", issueId).in("status", ["QUEUED", "CLONING", "INVESTIGATING", "FIXING", "VALIDATING"]).limit(1);
  if (lookupError) throw new Error("Cannot check existing Bob jobs.");
  if (active?.length) throw new Error("This issue already has an active Bob job. Open Bob Resolution to check it.");
  const { data, error } = await db.from("bob_jobs").insert({ issue_id: issueId, repo_url: project.repoUrl, base_branch: project.defaultBranch }).select("id").single();
  if (error || !data) throw new Error("Cannot create Bob job for this issue.");
  return { jobId: data.id as string, issueId };
}
export async function listJobSummaries() {
  const { data, error } = await createSupabaseServerClient().from("bob_jobs")
    .select("id,issue_id::text,status,review_status,created_at,finished_at").order("created_at", { ascending: false });
  if (error) throw new Error("Cannot load Bob jobs. Run docs/supabase-review.sql.");
  return data ?? [];
}
