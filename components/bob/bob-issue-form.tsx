"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { BobResolveResult, BobActivityEvent, BobProject, BobStoredJob } from "@/types/bob";

// ---------------------------------------------------------------------------
// Status badge colours
// ---------------------------------------------------------------------------
const STATUS_COLOR: Record<string, string> = {
  QUEUED: "bg-gray-100 text-gray-700",
  CLONING: "bg-blue-100 text-blue-700",
  INVESTIGATING: "bg-yellow-100 text-yellow-700",
  FIXING: "bg-orange-100 text-orange-700",
  VALIDATING: "bg-purple-100 text-purple-700",
  READY_FOR_REVIEW: "bg-green-100 text-green-700",
  NEEDS_HUMAN_INTERVENTION: "bg-amber-100 text-amber-800",
  FAILED: "bg-red-100 text-red-700",
};

const KIND_ICON: Record<string, string> = {
  repository_loaded: "📂",
  reading_file: "📄",
  modifying_file: "✏️",
  running_command: "⚙️",
  test_result: "🧪",
  build_result: "🏗️",
  task_completed: "✅",
  error: "❌",
  info: "ℹ️",
};

export default function BobIssueForm({ basePath = "/issues/new", heading = "Report an issue", issueId, jobId: requestedJobId, reviewOnly = false }: { basePath?: string; heading?: string; issueId?: string; jobId?: string; reviewOnly?: boolean }) {
  const [projects, setProjects] = useState<BobProject[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectId, setProjectId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [expectedBehavior, setExpectedBehavior] = useState("");
  const [screenshotRef, setScreenshotRef] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BobResolveResult | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [projectError, setProjectError] = useState<string | null>(null);
  const [savedJob, setSavedJob] = useState<BobStoredJob | null>(null);
  const [liveActivity, setLiveActivity] = useState<BobActivityEvent[]>([]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewToken, setReviewToken] = useState("");

  async function reviewFix(decision: "approve" | "reject") {
    if (!result?.jobId || reviewLoading) return;
    setReviewLoading(true);
    setRequestError(null);
    try {
      const response = await fetch(`/api/bob/jobs/${encodeURIComponent(result.jobId)}/review`, {
        method: "POST", headers: { "Content-Type": "application/json", "X-Review-Token": reviewToken.trim() },
        body: JSON.stringify({ decision }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Review failed.");
      setSavedJob(data.job);
      setResult(data.job.result);
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : "Review failed.");
    } finally { setReviewLoading(false); }
  }

  useEffect(() => {
    if (!loading) return;
    const started = Date.now();
    const timer = setInterval(() => setElapsedSeconds(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [loading]);

  const selectedProject = projects.find((p) => p.id === projectId);

  useEffect(() => {
    const controller = new AbortController();
    async function loadProjects() {
      try {
        const response = await fetch("/api/projects", { cache: "no-store", signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Cannot load projects.");
        setProjects(data.projects);
        setProjectId(data.projects.find((project: BobProject) => project.name === "demo-login-app")?.id ?? data.projects[0]?.id ?? "");
      } catch (error) {
        if (!controller.signal.aborted) setProjectError(error instanceof Error ? error.message : "Cannot load projects.");
      } finally {
        if (!controller.signal.aborted) setProjectsLoading(false);
      }
    }
    async function restoreJob() {
      const jobId = requestedJobId || new URL(window.location.href).searchParams.get("job");
      if (!jobId) return;
      try {
        const response = await fetch(`/api/bob/jobs/${encodeURIComponent(jobId)}`, { cache: "no-store", signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Cannot load saved job.");
        setSavedJob(data.job);
        setResult(data.job.result);
      } catch (error) {
        if (!controller.signal.aborted) setRequestError(error instanceof Error ? error.message : "Cannot load saved job.");
      }
    }
    void loadProjects();
    void restoreJob();
    return () => controller.abort();
  }, [requestedJobId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if ((!issueId && !selectedProject) || loading) return;
    setLoading(true);
    setElapsedSeconds(0);
    setResult(null);
    setRequestError(null);
    setSavedJob(null);
    setLiveActivity([]);
    if (!issueId) window.history.replaceState(null, "", basePath);

    try {
      const body = issueId ? { issueId } : {
        projectId: selectedProject!.id,
        issue: {
          title,
          description,
          expectedBehavior,
          screenshotRef,
        },
      };

      const res = await fetch("/api/bob/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/x-ndjson" },
        body: JSON.stringify(body),
      });

      let data: BobResolveResult & { persistenceError?: string; error?: string };
      if (res.headers.get("content-type")?.includes("application/x-ndjson") && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let pending = "";
        let finalResult: typeof data | undefined;
        const consume = (line: string) => {
          if (!line.trim()) return;
          const event = JSON.parse(line);
          if (event.type === "started") window.history.replaceState(null, "", `${basePath}?${issueId ? `issue=${encodeURIComponent(issueId)}&` : ""}job=${encodeURIComponent(event.jobId)}`);
          if (event.type === "activity") setLiveActivity(previous => [...previous, event.event].slice(-500));
          if (event.type === "result") finalResult = event.result;
        };
        try {
          while (true) {
            const chunk = await reader.read();
            if (chunk.done) break;
            pending += decoder.decode(chunk.value, { stream: true });
            let newline;
            while ((newline = pending.indexOf("\n")) !== -1) {
              consume(pending.slice(0, newline));
              pending = pending.slice(newline + 1);
            }
          }
          consume(pending + decoder.decode());
        } finally { reader.releaseLock(); }
        if (!finalResult) throw new Error("Connection ended before Bob returned a result. The job ID is saved in this page URL; refresh to check its status.");
        data = finalResult;
      } else data = await res.json();
      if (!data.status) throw new Error(data.error || "Invalid API response.");
      setResult(data);
      if (data.persistenceError) {
        setRequestError(data.persistenceError);
      } else if (data.jobId) {
        window.history.replaceState(null, "", `${basePath}?job=${encodeURIComponent(data.jobId)}`);
      }
    } catch (err) {
      setRequestError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mx-auto max-w-3xl space-y-6 rounded-2xl border border-zinc-100 bg-white p-6 shadow-sm">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">{heading}</h1>
        <p className="text-sm text-muted-foreground">
          {issueId ? `Investigate saved issue #${issueId}.` : reviewOnly ? "Review the saved Bob result and publish the approved fix to GitHub." : "Submit a bug report and watch IBM Bob Shell investigate and fix it."}
        </p>
        <Link href="/dashboard" className="text-sm underline underline-offset-4">
          ← Back to Dashboard
        </Link>
      </div>

      {projectError && <p role="alert" className="text-sm text-destructive">{projectError}</p>}
      {projectsLoading && <p className="text-sm text-muted-foreground">Loading projects from Supabase...</p>}
      {!projectsLoading && !projectError && projects.length === 0 && (
        <p className="text-sm text-muted-foreground">No projects yet. Add a project with NameProjek and RepoUrl in Supabase.</p>
      )}
      {savedJob && !result && (
        <p className="text-sm">Saved job: {savedJob.status}. Refresh to check for a completed result.</p>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Form                                                                 */}
      {/* ------------------------------------------------------------------ */}
      {!reviewOnly && <form onSubmit={handleSubmit} className="space-y-4">
        {!issueId && <>
        <div className="space-y-1">
          <label htmlFor="project" className="block text-sm font-medium">
            Project
          </label>
          <select
            id="project"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            disabled={loading || projectsLoading || !projects.length}
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            {selectedProject && <>Repository: {selectedProject.repoUrl} ({selectedProject.defaultBranch})</>}
          </p>
        </div>

        <div className="space-y-1">
          <label htmlFor="title" className="block text-sm font-medium">
            Bug title
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            required
            disabled={loading}
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="description" className="block text-sm font-medium">
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            required
            disabled={loading}
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="expectedBehavior" className="block text-sm font-medium">Expected behavior (optional)</label>
          <textarea id="expectedBehavior" value={expectedBehavior} onChange={(e) => setExpectedBehavior(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" disabled={loading} />
        </div>

        <div className="space-y-1">
          <label htmlFor="screenshotFile" className="block text-sm font-medium">Screenshot/file (optional)</label>
          <input id="screenshotFile" type="file" disabled={loading} className="w-full text-sm"
            onChange={event => {
              const file = event.target.files?.[0];
              setScreenshotRef(file ? `local-file: ${file.name}; size=${file.size}; type=${file.type || "unknown"}` : "");
            }} />
          <p className="text-xs text-muted-foreground">Only the filename, size, and type are saved. File contents are not uploaded or analyzed.</p>
        </div>

        <div className="space-y-1">
          <label htmlFor="screenshotRef" className="block text-sm font-medium">
            Screenshot reference{" "}
            <span className="font-normal text-muted-foreground">(optional)</span>
          </label>
          <input
            id="screenshotRef"
            type="text"
            value={screenshotRef}
            onChange={(e) => setScreenshotRef(e.target.value)}
            placeholder="e.g. uploads/screenshot.png"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            disabled={loading}
          />
        </div>

        </>}
        <button
          type="submit"
          disabled={loading || (!issueId && (!selectedProject || projectsLoading))}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/80 disabled:opacity-50"
        >
          {loading ? "Running Bob Shell…" : "Submit to Bob"}
        </button>
      </form>}

      {/* ------------------------------------------------------------------ */}
      {/* Loading indicator                                                    */}
      {/* ------------------------------------------------------------------ */}
      {loading && (
        <div className="rounded-md border border-border bg-muted p-4 text-sm text-muted-foreground">
          <p className="font-medium">Bob Shell is running…</p>
          <p className="mt-1 text-xs">
            Cloning repository → investigating bug → applying fix → validating.
            This may take several minutes.
          </p>
          <p className="mt-2 text-xs">Elapsed: {elapsedSeconds}s. No Bob output for 180s will stop the session; maximum runtime is 10 minutes.</p>
          <ol aria-live="polite" className="mt-3 space-y-1">
            {liveActivity.map((event, index) => <li key={index}>{event.message}</li>)}
          </ol>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Network / fetch error                                                */}
      {/* ------------------------------------------------------------------ */}
      {requestError && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <p className="font-medium">Request failed</p>
          <p className="mt-1 text-xs font-mono">{requestError}</p>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Result                                                               */}
      {/* ------------------------------------------------------------------ */}
      {result && !loading && (
        <div className="space-y-6">
          {/* Status header */}
          <div className="flex items-center gap-3">
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_COLOR[result.status] ?? "bg-gray-100 text-gray-700"}`}
            >
              {result.status}
            </span>
            <span className="text-sm text-muted-foreground">
              Issue: {result.issueId}
            </span>
            {result.bobTaskId && (
              <span className="text-xs text-muted-foreground">
                Bob task: {result.bobTaskId}
              </span>
            )}
          </div>

          {/* Root cause */}
          {result.review && (
            <Section title="Human review">
              <p className="text-sm">Review status: {result.review.status}</p>
              <p className="mt-2 text-xs text-muted-foreground">Approve saves this fix as a commit on GitHub branch {result.review.branch}. Reject leaves GitHub unchanged.</p>
              <details className="mt-3" open>
                <summary className="cursor-pointer text-sm font-medium">Review code changes</summary>
                <pre className="mt-2 max-h-96 overflow-auto whitespace-pre text-xs">{result.review.patch}</pre>
              </details>
              {result.review.commitUrl && <a href={result.review.commitUrl} target="_blank" rel="noopener noreferrer" className="mt-3 block text-sm underline">View approved commit on GitHub</a>}
              {result.review.error && <p role="alert" className="mt-2 text-sm text-destructive">{result.review.error}</p>}
              {["PENDING", "PUBLISH_FAILED"].includes(result.review.status) && (
                <div className="mt-4 space-y-3">
                  <label className="block text-sm">Reviewer access code
                    <input type="password" autoComplete="off" value={reviewToken} onChange={event => setReviewToken(event.target.value)}
                      className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2" disabled={reviewLoading} />
                  </label>
                  <p className="text-xs text-muted-foreground">Copy only the value after DEVRESOLVE_REVIEW_TOKEN= in your local .env.local file. Do not enter the variable name or GitHub token.</p>
                  <div className="flex gap-3">
                    <button type="button" disabled={reviewLoading || !reviewToken} onClick={() => void reviewFix("approve")}
                      className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50">{reviewLoading ? "Saving decision..." : "Approve & save to GitHub"}</button>
                    <button type="button" disabled={reviewLoading || !reviewToken || result.review.status !== "PENDING"} onClick={() => void reviewFix("reject")}
                      className="rounded-md border px-4 py-2 text-sm disabled:opacity-50">Reject</button>
                  </div>
                  {result.review.status === "PUBLISH_FAILED" && <p className="text-xs text-muted-foreground">Retry approval to reconcile the GitHub branch before making another decision.</p>}
                </div>
              )}
            </Section>
          )}
          {result.status === "READY_FOR_REVIEW" && !result.review && (
            <p className="text-sm text-muted-foreground">This older job has no saved code artifact. Run Bob again to review and publish the fix.</p>
          )}
          {result.rootCause && (
            <Section title="Root cause">
              <p className="text-sm">{result.rootCause}</p>
            </Section>
          )}

          {/* Reason (human intervention / failure) */}
          {result.reason && (
            <Section title={result.status === "NEEDS_HUMAN_INTERVENTION" ? "Why human intervention is needed" : "Reason"}>
              <p className="text-sm">{result.reason}</p>
              {result.status === "NEEDS_HUMAN_INTERVENTION" && (
                <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs dark:border-amber-800/50 dark:bg-amber-900/20">
                  <p className="font-semibold text-amber-800 dark:text-amber-300">Continue in IBM Bob IDE</p>
                  <p className="mt-1 text-amber-700 dark:text-amber-400">
                    Repository: <code>{result.repoUrl}</code>
                    <br />
                    Branch: <code>{result.branch}</code>
                    {result.bobTaskId && (
                      <>
                        <br />
                        Task ID: <code>{result.bobTaskId}</code>
                      </>
                    )}
                  </p>
                </div>
              )}
            </Section>
          )}

          {/* Validation */}
          {result.validationSummary && (
            <Section title="Validation">
              <p className="text-sm">{result.validationSummary}</p>
            </Section>
          )}

          {/* Changed files */}
          {result.changedFiles.length > 0 && (
            <Section title="Changed files">
              <ul className="space-y-1">
                {result.changedFiles.map((f) => (
                  <li key={f} className="font-mono text-xs">
                    {f}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* Branch info */}
          {result.branch && (
            <Section title="Fix branch">
              <p className="font-mono text-xs">{result.branch}</p>
              {result.repoUrl && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {result.repoUrl}
                </p>
              )}
            </Section>
          )}

          {/* Activity log */}
          {result.activity.length > 0 && (
            <Section title={`Agent activity (${result.activity.length} events)`}>
              <ol className="space-y-1">
                {result.activity.map((ev: BobActivityEvent, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-xs">
                    <span className="shrink-0">{KIND_ICON[ev.kind] ?? "•"}</span>
                    <span className="text-muted-foreground">{ev.message}</span>
                    {ev.success !== undefined && (
                      <span className={ev.success ? "text-green-600" : "text-red-600"}>
                        {ev.success ? "✓" : "✗"}
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            </Section>
          )}
        </div>
      )}
    </section>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h2 className="text-sm font-semibold">{title}</h2>
      <div className="rounded-md border border-border bg-muted/30 p-3">{children}</div>
    </div>
  );
}
