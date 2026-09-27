import { createWorkspace, installDependencies, validateRepoUrl } from "@/lib/bob/workspace";
import { buildBobPrompt } from "@/lib/bob/prompt-builder";
import { checkBobAvailability, runBob } from "@/lib/bob/runner";
import { BobStreamParser } from "@/lib/bob/parser";
import { databaseId, validateSubmission } from "@/lib/bob/request";
import { createExistingIssueJob, getIssue } from "@/lib/supabase/issues";
import { redactSecrets } from "@/lib/bob/redact";
import { captureArtifact, workspaceHead } from "@/lib/bob/artifact";
import { createJob, ensureReviewSchema, getProject, getReviewJob, saveResult, saveReviewArtifact, updateJob } from "@/lib/supabase/bob-store";
import type { BobProject, BobResolveResult } from "@/types/bob";
import { requireRole, sessionFromRequest } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const denied = requireRole(request, "developer");
  if (denied) return denied;
  const reporterId = sessionFromRequest(request)?.id;
  let submission: ReturnType<typeof validateSubmission>;
  let existingIssueId: string | null = null;
  let revision: { previousJobId: string; feedback: string; previousPatch: string } | undefined;
  try {
    const body = await request.json();
    if (body.issueId !== undefined) {
      existingIssueId = databaseId(body.issueId);
      if (!existingIssueId) throw new Error("Invalid issue ID.");
      const saved = await getIssue(existingIssueId);
      if (!saved) return Response.json({ error: "Issue not found." }, { status: 404 });
      submission = validateSubmission(saved);
      // Follow-up round: address the reviewer's requested changes on an earlier job for this issue.
      if (body.previousJobId !== undefined) {
        if (typeof body.previousJobId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.previousJobId)) throw new Error("Invalid previous job ID.");
        const previous = await getReviewJob(body.previousJobId);
        const feedback = previous.result?.review?.feedback;
        if (previous.issue_id !== existingIssueId || previous.review_status !== "CHANGES_REQUESTED" || !feedback) {
          throw new Error("The previous job has no requested changes for this issue.");
        }
        revision = { previousJobId: previous.id, feedback, previousPatch: previous.artifact?.patch || previous.result?.review?.patch || "" };
      }
    } else submission = validateSubmission(body);
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Invalid request." }, { status: 400 });
  }

  let project: BobProject;
  let job: Awaited<ReturnType<typeof createJob>>;
  try {
    const selectedProject = await getProject(submission.projectId);
    if (!selectedProject) return Response.json({ error: "Project not found." }, { status: 404 });
    project = selectedProject;
    validateRepoUrl(project.repoUrl);
    await ensureReviewSchema();
    job = existingIssueId ? await createExistingIssueJob(project, existingIssueId) : await createJob(project, submission.issue, reporterId);
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Cannot create job." }, { status: 503 });
  }

  const secretValues = [process.env.BOBSHELL_API_KEY, process.env.BOB_API_KEY, process.env.SUPABASE_SERVICE_ROLE_KEY, process.env.GITHUB_TOKEN, process.env.DEVRESOLVE_REVIEW_TOKEN];
  type Progress = { type: "started" | "activity" | "heartbeat" | "result"; [key: string]: unknown };
  async function execute(send: (event: Progress) => void = () => {}) {
    send({ type: "started", jobId: job.jobId, issueId: job.issueId });
    let cleanup: (() => Promise<void>) | undefined;
    let branch: string | undefined;
    let result: BobResolveResult;
    let cleanupFailed = false;
    const activity: BobResolveResult["activity"] = [{ kind: "info", message: "Project resolved from Supabase", timestamp: new Date().toISOString() }];
    if (revision) activity.push({ kind: "info", message: "Addressing reviewer feedback from the previous round", timestamp: new Date().toISOString() });
    for (const event of activity) send({ type: "activity", event });
    const parser = new BobStreamParser();
    try {
      const launch = await checkBobAvailability();
      await updateJob(job.jobId, { status: "CLONING", started_at: new Date().toISOString() });
      send({ type: "activity", event: { kind: "info", message: "Cloning the repository", timestamp: new Date().toISOString() } });
      const workspace = await createWorkspace(project.repoUrl, project.defaultBranch, job.issueId);
      cleanup = workspace.cleanup;
      branch = workspace.fixBranch;
      const baseSha = await workspaceHead(workspace.workspacePath);
      activity.push({ kind: "repository_loaded", message: "Repository cloned and fix branch created", timestamp: new Date().toISOString() });
      send({ type: "activity", event: activity.at(-1) });
      send({ type: "activity", event: { kind: "running_command", message: "Installing project dependencies", timestamp: new Date().toISOString() } });
      const installed = await installDependencies(workspace.workspacePath);
      activity.push({ kind: "info", message: installed ? "Dependencies installed" : "Dependencies not pre-installed; Bob will install them if needed", timestamp: new Date().toISOString() });
      send({ type: "activity", event: activity.at(-1) });
      await updateJob(job.jobId, { status: "INVESTIGATING", fix_branch: branch });
      const run = await runBob({ workspacePath: workspace.workspacePath, launch,
        prompt: buildBobPrompt({ issueId: job.issueId, project, issue: submission.issue, fixBranch: branch, revision }),
        onLine(line) {
          const previousCount = parser.activity.length;
          parser.consume(line);
          for (const event of parser.activity.slice(previousCount)) send({ type: "activity", event });
        } });
      const parsed = parser.finish(run.exitCode);
      result = { ...parsed, activity: [...activity, ...parsed.activity], jobId: job.jobId, issueId: job.issueId,
        repoUrl: project.repoUrl, branch, bobTaskId: run.bobTaskId, previousJobId: revision?.previousJobId };
      if (result.status === "READY_FOR_REVIEW") {
        const artifact = await captureArtifact(workspace.workspacePath, baseSha, secretValues);
        if (artifact) {
          const publishBranch = `${branch}-${job.jobId.slice(0, 8)}`;
          result.changedFiles = artifact.files.map(file => file.path);
          result.review = { status: "PENDING", patch: artifact.patch, branch: publishBranch };
          await saveReviewArtifact(job.jobId, artifact);
        } else {
          result.status = "FAILED";
          result.reason = `Bob finished and validation passed, but made no code changes. The bug may already be fixed on the "${project.defaultBranch}" branch — check the root cause below, then close the issue or point the project at a branch that still has the bug.`;
        }
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Bob execution failed.";
      result = { status: "FAILED", jobId: job.jobId, issueId: job.issueId, repoUrl: project.repoUrl,
        branch, reason, changedFiles: [], previousJobId: revision?.previousJobId,
        activity: [...activity, ...parser.activity, { kind: "error", message: reason, timestamp: new Date().toISOString() }] };
    } finally {
      try { await cleanup?.(); } catch {
        cleanupFailed = true;
      }
    }

    try {
      if (cleanupFailed) result.activity.push({ kind: "error", message: "Temporary workspace cleanup failed; inspect the server's temp directory.", timestamp: new Date().toISOString() });
      result = redactSecrets(result, secretValues);
      await saveResult(job.jobId, result);
      return { result, status: result.status === "FAILED" ? 500 : 200 };
    } catch {
      return { result: { ...result, persistenceError: "Bob finished, but saving the result failed. Save this response before refreshing." }, status: 503 };
    }
  }

  // Existing API clients retain their JSON response; the form opts into progress streaming.
  if (!request.headers.get("accept")?.includes("application/x-ndjson")) {
    const output = await execute();
    return Response.json(output.result, { status: output.status });
  }
  const encoder = new TextEncoder();
  let connected = true;
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: Progress) => {
        if (!connected) return;
        try { controller.enqueue(encoder.encode(JSON.stringify(redactSecrets(event, secretValues)) + "\n")); }
        catch { connected = false; }
      };
      const heartbeat = setInterval(() => send({ type: "heartbeat" }), 10000);
      try {
        const output = await execute(send);
        send({ type: "result", result: output.result });
      } finally {
        clearInterval(heartbeat);
        if (connected) controller.close();
      }
    },
    cancel() { connected = false; },
  });
  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson", "Cache-Control": "no-store", "X-Accel-Buffering": "no" } });
}
