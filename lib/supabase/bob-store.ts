import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { BobArtifact, BobIssue, BobProject, BobResolveResult, BobReviewStatus, BobStoredJob } from "@/types/bob";
import { persistReviewArtifact } from "./review-persistence.ts";

type ProjectRow = { id: string; NameProjek: string; RepoUrl: string; DefaultBranch: string };

function projectFromRow(row: ProjectRow): BobProject {
  return { id: row.id, name: row.NameProjek, repoUrl: row.RepoUrl, defaultBranch: row.DefaultBranch || "main" };
}

export async function listProjects() {
  const { data, error } = await createSupabaseServerClient().from("projects")
    .select("id::text,NameProjek,RepoUrl,DefaultBranch").order("id");
  if (error) throw new Error("Cannot load projects. Check Supabase configuration and run docs/supabase-bob.sql.");
  return (data as unknown as ProjectRow[]).map(projectFromRow);
}

export async function getProject(id: string) {
  const { data, error } = await createSupabaseServerClient().from("projects")
    .select("id::text,NameProjek,RepoUrl,DefaultBranch").eq("id", id).maybeSingle();
  if (error) throw new Error("Cannot load project. Check Supabase configuration and migration.");
  return data ? projectFromRow(data as unknown as ProjectRow) : null;
}

export async function createJob(project: BobProject, issue: BobIssue) {
  const { data, error } = await createSupabaseServerClient().rpc("create_bob_issue_job", {
    p_project_id: project.id, p_title: issue.title, p_description: issue.description,
    p_expected_behavior: issue.expectedBehavior ?? null, p_screenshot_ref: issue.screenshotRef ?? null,
    p_reporter_id: process.env.DEVRESOLVE_DEMO_REPORTER_ID || "demo",
    p_category: process.env.DEVRESOLVE_DEMO_ISSUE_CATEGORY || "BUG",
    p_issue_status: process.env.DEVRESOLVE_DEMO_ISSUE_STATUS || "OPEN",
  });
  if (error || !data) throw new Error("Cannot save issue/job. Run docs/supabase-bob.sql and check required issue fields.");
  return data as { jobId: string; issueId: string };
}

export async function ensureReviewSchema() {
  const { error } = await createSupabaseServerClient().from("bob_jobs")
    .select("artifact,review_status,review_error,published_commit_url").limit(0);
  if (error) throw new Error("Run docs/supabase-review.sql in Supabase SQL Editor before starting a new Bob job.");
}

export async function updateJob(id: string, values: Record<string, unknown>) {
  const { data, error } = await createSupabaseServerClient().from("bob_jobs")
    .update(values).eq("id", id).select("id").single();
  if (error || !data) throw new Error("Cannot persist Bob job. Check Supabase connection.");
}

export async function saveReviewArtifact(id: string, artifact: BobArtifact) {
  await persistReviewArtifact(() => createSupabaseServerClient().from("bob_jobs")
    .update({ artifact, review_status: "PENDING" }).eq("id", id).select("id").single());
}

export async function saveResult(id: string, result: BobResolveResult) {
  await updateJob(id, { status: result.status, result, fix_branch: result.branch ?? null,
    bob_task_id: result.bobTaskId ?? null, finished_at: new Date().toISOString() });
}

export async function getJob(id: string): Promise<BobStoredJob | null> {
  const { data, error } = await createSupabaseServerClient().from("bob_jobs")
    .select("id,issue_id::text,status,result,created_at,finished_at").eq("id", id).maybeSingle();
  if (error) throw new Error("Cannot load saved Bob job. Check Supabase configuration and migration.");
  if (!data) return null;
  const job = data as BobStoredJob;
  // Legacy jobs have no artifact and retain their original result.
  if (job.result?.review) {
    const review = await getReviewJob(id);
    job.result.review.status = review.review_status || "PENDING";
    job.result.review.commitUrl = review.published_commit_url || undefined;
    job.result.review.error = review.review_error || undefined;
    if (review.review_status === "APPROVED") job.result.branch = job.result.review.branch;
  }
  return job;
}

export interface ReviewJob {
  id: string;
  status: string;
  repo_url: string;
  base_branch: string;
  artifact: BobArtifact | null;
  result: BobResolveResult | null;
  review_status: BobReviewStatus | null;
  review_error: string | null;
  published_commit_url: string | null;
}

export async function getReviewJob(id: string): Promise<ReviewJob> {
  const { data, error } = await createSupabaseServerClient().from("bob_jobs")
    .select("id,status,repo_url,base_branch,artifact,result,review_status,review_error,published_commit_url").eq("id", id).single();
  if (error || !data) throw new Error("Cannot load review. Run docs/supabase-review.sql and check the job ID.");
  return data as ReviewJob;
}

export async function claimReview(id: string, decision: "approve" | "reject") {
  const { data, error } = await createSupabaseServerClient().from("bob_jobs")
    .update({ review_status: decision === "approve" ? "PUBLISHING" : "REJECTED", review_error: null })
    .eq("id", id).eq("status", "READY_FOR_REVIEW").in("review_status", decision === "approve" ? ["PENDING", "PUBLISH_FAILED"] : ["PENDING"])
    .select("id").maybeSingle();
  if (error) throw new Error("Cannot save review decision.");
  return Boolean(data);
}
