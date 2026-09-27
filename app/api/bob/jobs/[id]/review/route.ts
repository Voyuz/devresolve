import { claimReview, getJob, getReviewJob, saveReviewFeedback, updateJob } from "@/lib/supabase/bob-store";
import { publishArtifact } from "@/lib/github/publish";
import { timingSafeEqual } from "node:crypto";
import { requireRole } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = requireRole(request, "developer");
  if (denied) return denied;
  // Local PoC only until authenticated reviewer authorization is implemented.
  const url = new URL(request.url);
  if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) || request.headers.get("origin") !== url.origin ||
    !request.headers.get("content-type")?.startsWith("application/json")) {
    return Response.json({ error: "Review publishing is restricted to the local application. Remote use requires reviewer authentication." }, { status: 403 });
  }
  const configured = process.env.DEVRESOLVE_REVIEW_TOKEN?.trim();
  const supplied = (request.headers.get("x-review-token") || "").trim();
  if (!configured) return Response.json({ error: "Reviewer access code is not configured on this server. Set DEVRESOLVE_REVIEW_TOKEN in .env.local and restart Next.js." }, { status: 503 });
  if (!supplied) return Response.json({ error: "Fill the Reviewer access code field before approving or rejecting." }, { status: 403 });
  if (Buffer.byteLength(supplied) !== Buffer.byteLength(configured) ||
    !timingSafeEqual(Buffer.from(supplied), Buffer.from(configured))) {
    return Response.json({ error: "Reviewer access code does not match. Copy only the value after DEVRESOLVE_REVIEW_TOKEN= from .env.local, then restart the server if the value changed." }, { status: 403 });
  }
  const { id } = await context.params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return Response.json({ error: "Invalid job ID." }, { status: 400 });
  let decision, feedback = "";
  try {
    const body = await request.json();
    decision = body.decision;
    if (typeof body.feedback === "string") feedback = body.feedback.trim();
  } catch { return Response.json({ error: "Invalid request." }, { status: 400 }); }
  if (decision !== "approve" && decision !== "reject" && decision !== "request_changes") return Response.json({ error: "Choose approve, reject, or request_changes." }, { status: 400 });
  if (decision === "request_changes" && (!feedback || feedback.length > 2000)) return Response.json({ error: "Describe the requested changes (1-2000 characters)." }, { status: 400 });
  let claimed = false;
  try {
    const job = await getReviewJob(id);
    if (job.review_status === "APPROVED" || job.review_status === "REJECTED" || job.review_status === "CHANGES_REQUESTED") return Response.json({ job: await getJob(id) });
    if (job.status !== "READY_FOR_REVIEW" || !job.artifact || !job.result?.review) return Response.json({ error: "This job has no saved review artifact. Run Bob again to capture the fix." }, { status: 409 });
    if (decision === "approve" && !process.env.GITHUB_TOKEN) return Response.json({ error: "Configure GITHUB_TOKEN in .env.local with Contents: Read and write for this repository." }, { status: 503 });
    claimed = await claimReview(id, decision);
    if (!claimed) return Response.json({ error: "This job is already being reviewed. Refresh its status before retrying." }, { status: 409 });
    if (decision === "request_changes") await saveReviewFeedback(id, job.result!, feedback);
    if (decision === "approve") {
      const published = await publishArtifact({ repoUrl: job.repo_url, baseBranch: job.base_branch,
        branch: job.result.review.branch, jobId: id, artifact: job.artifact, token: process.env.GITHUB_TOKEN! });
      await updateJob(id, { review_status: "APPROVED", published_commit_url: published.commitUrl, fix_branch: published.branch, review_error: null });
    }
    return Response.json({ job: await getJob(id) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Review failed.";
    // Feedback could not be saved: reopen the review rather than leave it without instructions.
    if (claimed && decision === "request_changes") await updateJob(id, { review_status: "PENDING" }).catch(() => undefined);
    if (claimed && decision === "approve") {
      try { await updateJob(id, { review_status: "PUBLISH_FAILED", review_error: message }); }
      catch { return Response.json({ error: "Review state could not be saved. Check GitHub and the stored job before retrying." }, { status: 503 }); }
    }
    return Response.json({ error: message }, { status: 503 });
  }
}
