import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { BobIssue, BobProject } from "@/types/bob";
import type { PriorityLevel, SeverityLevel, TriageInput } from "@/types/issues";

export async function normalizedIssueSchema() {
  const { error } = await createSupabaseServerClient().from("issues").select("project_id").limit(0);
  if (!error) return true;
  if (error.code === "42703" || error.code === "PGRST204") return false;
  throw new Error("Cannot inspect issue schema. Check Supabase configuration.");
}

export async function listIssues() {
  const normalized = await normalizedIssueSchema();
  const { data, error } = await createSupabaseServerClient().from("issues")
    .select(normalized ? "id::text,created_at,updated_at,project_id::text,reporter_id,title,description,category_issues,status,severity,priority,expected_behavior,actual_behavior,error_log" : 'id::text,created_at,ProjekId,ReporterId,title,description,CategoryIssues,Status,expected_behavior,screenshot_ref').order("id", { ascending: false });
  if (error) throw new Error("Cannot load issues. Check Supabase configuration and migration.");
  const rows = (data ?? []) as unknown as Record<string, unknown>[];
  return rows.map(row => normalized ? { id: row.id, created_at: row.created_at,
    ProjekId: row.project_id, ReporterId: row.reporter_id, title: row.title, description: row.description,
    CategoryIssues: row.category_issues, Status: row.status, expected_behavior: row.expected_behavior,
    screenshot_ref: null, severity: row.severity, priority: row.priority,
    updated_at: row.updated_at, actual_behavior: row.actual_behavior, error_log: row.error_log } : row);
}
export async function saveIssue(project: BobProject, issue: BobIssue, reporterId?: string) {
  const normalized = await normalizedIssueSchema();
  const values: Record<string, string | null> = normalized ? {
    project_id: project.id, reporter_id: reporterId || process.env.DEVRESOLVE_DEMO_REPORTER_ID || "demo",
    title: issue.title, description: issue.description + (issue.screenshotRef ? "\n\nAttachment metadata: " + issue.screenshotRef : ""),
    category_issues: "BUG", status: "reported", expected_behavior: issue.expectedBehavior ?? null,
    actual_behavior: issue.actualBehavior ?? null, error_log: issue.errorLog ?? null,
  } : {
    ProjekId: project.id, ReporterId: reporterId || process.env.DEVRESOLVE_DEMO_REPORTER_ID || "demo",
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
    .select(normalized ? "id::text,project_id::text,title,description,expected_behavior,actual_behavior,error_log" : "id::text,ProjekId,title,description,expected_behavior,screenshot_ref").eq("id", id).maybeSingle();
  if (error) throw new Error("Cannot load issue.");
  if (!data) return null;
  const row = data as unknown as Record<string, string | null>;
  return { projectId: (normalized ? row.project_id : row.ProjekId)!, issue: {
    title: row.title!, description: row.description!,
    expectedBehavior: row.expected_behavior ?? undefined, screenshotRef: row.screenshot_ref ?? undefined,
    actualBehavior: row.actual_behavior ?? undefined, errorLog: row.error_log ?? undefined,
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

export async function getTriageInput(id: string) {
  const { data, error } = await createSupabaseServerClient().from("issues")
    .select("id::text,title,description,expected_behavior,actual_behavior,error_log,status").eq("id", id).maybeSingle();
  if (error) throw new Error("Cannot load issue for triage.");
  if (!data) return null;
  const row = data as unknown as Record<string, string | null>;
  return { status: row.status, input: { title: row.title ?? "", description: row.description ?? "",
    expectedBehavior: row.expected_behavior, actualBehavior: row.actual_behavior, errorLog: row.error_log } satisfies TriageInput };
}

/** Saves classification; moves a still-"reported" issue to "triaged" without regressing later statuses. */
export async function saveTriage(id: string, values: { category?: string; severity?: SeverityLevel; priority?: PriorityLevel }, markTriaged: boolean) {
  const update: Record<string, string> = { updated_at: new Date().toISOString() };
  if (values.category) update.category_issues = values.category;
  if (values.severity) update.severity = values.severity;
  if (values.priority) update.priority = values.priority;
  const db = createSupabaseServerClient();
  const { data, error } = await db.from("issues").update(update).eq("id", id).select("id").maybeSingle();
  if (error) throw new Error("Cannot save triage result.");
  if (!data) return false;
  if (markTriaged) {
    const { error: statusError } = await db.from("issues").update({ status: "triaged" }).eq("id", id).eq("status", "reported");
    if (statusError) throw new Error("Cannot update issue status.");
  }
  return true;
}

export interface IssueDetailRound {
  id: string; status: string; review_status: string | null; created_at: string; finished_at: string | null;
  fix_branch: string | null; published_commit_url: string | null;
  root_cause: string | null; validation: string | null; reason: string | null; feedback: string | null;
  changed_files: string[] | null;
}

/** One issue with every Bob round (oldest first); large result fields such as activity are not loaded. */
export async function getIssueDetail(id: string) {
  const db = createSupabaseServerClient();
  const { data, error } = await db.from("issues")
    .select("id::text,created_at,updated_at,project_id::text,reporter_id,title,description,category_issues,severity,priority,status,expected_behavior,actual_behavior,error_log")
    .eq("id", id).maybeSingle();
  if (error) throw new Error("Cannot load issue.");
  if (!data) return null;
  const { data: rounds, error: roundsError } = await db.from("bob_jobs")
    .select("id,status,review_status,created_at,finished_at,fix_branch,published_commit_url,root_cause:result->>rootCause,validation:result->>validationSummary,reason:result->>reason,feedback:result->review->>feedback,changed_files:result->changedFiles")
    .eq("issue_id", id).order("created_at", { ascending: true });
  if (roundsError) throw new Error("Cannot load Bob rounds for this issue.");
  return { issue: data as unknown as Record<string, string | null>, rounds: (rounds ?? []) as unknown as IssueDetailRound[] };
}

/** Work waiting on developers: running Bob jobs, fixes awaiting review, and untriaged reports. */
export async function getAttentionCounts() {
  const db = createSupabaseServerClient();
  const count = async (query: PromiseLike<{ count: number | null; error: unknown }>) => {
    const { count: value, error } = await query;
    if (error) throw new Error("Cannot load workspace counts.");
    return value ?? 0;
  };
  const [running, awaitingReview, untriaged] = await Promise.all([
    count(db.from("bob_jobs").select("id", { count: "exact", head: true }).in("status", ["QUEUED", "CLONING", "INVESTIGATING", "FIXING", "VALIDATING"])),
    count(db.from("bob_jobs").select("id", { count: "exact", head: true }).eq("status", "READY_FOR_REVIEW").eq("review_status", "PENDING")),
    count(db.from("issues").select("id", { count: "exact", head: true }).is("severity", null)),
  ]);
  return { running, awaitingReview, untriaged };
}
