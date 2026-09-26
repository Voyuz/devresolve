import { claimReview, getJob, getReviewJob, updateJob } from "@/lib/supabase/bob-store";
import { publishArtifact } from "@/lib/github/publish";
import { timingSafeEqual } from "node:crypto";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
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
  let decision;
  try { decision = (await request.json()).decision; } catch { return Response.json({ error: "Invalid request." }, { status: 400 }); }
  if (decision !== "approve" && decision !== "reject") return Response.json({ error: "Choose approve or reject." }, { status: 400 });
  let claimed = false;
  try {
    const job = await getReviewJob(id);
    if (job.review_status === "APPROVED" || job.review_status === "REJECTED") return Response.json({ job: await getJob(id) });
    if (job.status !== "READY_FOR_REVIEW" || !job.artifact || !job.result?.review) return Response.json({ error: "This job has no saved review artifact. Run Bob again to capture the fix." }, { status: 409 });
    if (decision === "approve" && !process.env.GITHUB_TOKEN) return Response.json({ error: "Configure GITHUB_TOKEN in .env.local with Contents: Read and write for this repository." }, { status: 503 });
    claimed = await claimReview(id, decision);
    if (!claimed) return Response.json({ error: "This job is already being reviewed. Refresh its status before retrying." }, { status: 409 });
    if (decision === "approve") {
      const published = await publishArtifact({ repoUrl: job.repo_url, baseBranch: job.base_branch,
        branch: job.result.review.branch, jobId: id, artifact: job.artifact, token: process.env.GITHUB_TOKEN! });
      await updateJob(id, { review_status: "APPROVED", published_commit_url: published.commitUrl, fix_branch: published.branch, review_error: null });
    }
    return Response.json({ job: await getJob(id) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Review failed.";
    if (claimed && decision === "approve") {
      try { await updateJob(id, { review_status: "PUBLISH_FAILED", review_error: message }); }
      catch { return Response.json({ error: "Review state could not be saved. Check GitHub and the stored job before retrying." }, { status: 503 }); }
    }
    return Response.json({ error: message }, { status: 503 });
  }
}
