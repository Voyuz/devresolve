"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { BobResolveResult, BobActivityEvent, BobProject, BobStoredJob } from "@/types/bob";
import { formatDateTime } from "@/lib/utils";
import { explainReason, roundState, TONE_CLASS } from "@/components/bob/round-status";
import { PatchView } from "@/components/bob/patch-view";
import { isRunningJob, resultFromJob } from "@/components/bob/saved-result";

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

// Bob's self-correction inside one run: how often it validated, and how often validation failed.
function validationStats(activity: BobActivityEvent[]) {
  const count = (predicate: (event: BobActivityEvent) => boolean) => activity.filter(predicate).length;
  return {
    testRuns: count(event => event.kind === "running_command" && event.message === "Running tests"),
    buildRuns: count(event => event.kind === "running_command" && event.message === "Running build"),
    failures: count(event => (event.kind === "test_result" || event.kind === "build_result") && event.success === false),
  };
}

export default function BobIssueForm({ basePath = "/issues/new", heading = "Report an issue", issueId, jobId: requestedJobId, previousJobId, reviewOnly = false, embedded = false }: { basePath?: string; heading?: string; issueId?: string; jobId?: string; previousJobId?: string; reviewOnly?: boolean; embedded?: boolean }) {
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
  const [feedback, setFeedback] = useState("");
  // undefined = loading, null = the previous job has no saved feedback
  const [previousFeedback, setPreviousFeedback] = useState<string | null | undefined>(undefined);
  const sectionRef = useRef<HTMLElement>(null);

  // Opening a job or issue from a list above: bring this panel into view.
  useEffect(() => {
    if (requestedJobId || issueId) sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [requestedJobId, issueId]);

  async function reviewFix(decision: "approve" | "reject" | "request_changes") {
    if (!result?.jobId || reviewLoading) return;
    setReviewLoading(true);
    setRequestError(null);
    try {
      const response = await fetch(`/api/bob/jobs/${encodeURIComponent(result.jobId)}/review`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(decision === "request_changes" ? { decision, feedback: feedback.trim() } : { decision }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Review failed.");
      setSavedJob(data.job);
      setResult(resultFromJob(data.job));
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
        setResult(resultFromJob(data.job));
      } catch (error) {
        if (!controller.signal.aborted) setRequestError(error instanceof Error ? error.message : "Cannot load saved job.");
      }
    }
    async function loadPreviousFeedback() {
      if (!previousJobId) return;
      try {
        const response = await fetch(`/api/bob/jobs/${encodeURIComponent(previousJobId)}`, { cache: "no-store", signal: controller.signal });
        const data = await response.json();
        setPreviousFeedback(response.ok ? data.job?.result?.review?.feedback ?? null : null);
      } catch { if (!controller.signal.aborted) setPreviousFeedback(null); }
    }
    void loadProjects();
    void restoreJob();
    void loadPreviousFeedback();
    return () => controller.abort();
  }, [requestedJobId, previousJobId]);

  // Reopened running jobs have no live stream; keep their saved status current.
  const pollingJobId = savedJob && isRunningJob(savedJob.status) ? savedJob.id : null;
  useEffect(() => {
    if (!pollingJobId || loading) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        const response = await fetch(`/api/bob/jobs/${encodeURIComponent(pollingJobId!)}`, {
          cache: "no-store", signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Cannot refresh saved job.");
        if (controller.signal.aborted) return;
        setSavedJob(data.job);
        setResult(resultFromJob(data.job));
        if (!isRunningJob(data.job.status)) return;
      } catch (error) {
        if (controller.signal.aborted) return;
        setRequestError(error instanceof Error ? error.message : "Cannot refresh saved job.");
      }
      timer = setTimeout(poll, 3000);
    }
    timer = setTimeout(poll, 3000);
    return () => { controller.abort(); clearTimeout(timer); };
  }, [pollingJobId, loading]);

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
      const body = issueId ? { issueId, ...(previousJobId ? { previousJobId } : {}) } : {
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
    <section ref={sectionRef} className={embedded
      // Inside a page: full width, same card style as the page's tables; the page provides navigation.
      ? "scroll-mt-24 space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      : "mx-auto max-w-3xl scroll-mt-24 space-y-6 rounded-2xl border border-zinc-100 bg-white p-6 shadow-sm"}>
      <div className="space-y-1">
        <h2 className={embedded ? "text-xl font-bold text-[#6287a2]" : "text-2xl font-semibold"}>{heading}</h2>
        <p className="text-sm text-muted-foreground">
          {issueId && previousJobId ? `Run Bob again on issue #${issueId} with the reviewer's requested changes.`
            : issueId ? `Investigate saved issue #${issueId}.` : reviewOnly ? "Review the saved Bob result and publish the approved fix to GitHub." : "Submit a bug report and watch IBM Bob Shell investigate and fix it."}
        </p>
        {!embedded && (
          <Link href="/dashboard" className="text-sm underline underline-offset-4">
            ← Back to Dashboard
          </Link>
        )}
      </div>

      {projectError && <p role="alert" className="text-sm text-destructive">{projectError}</p>}
      {projectsLoading && <p className="text-sm text-muted-foreground">Loading projects from Supabase...</p>}
      {!projectsLoading && !projectError && projects.length === 0 && (
        <p className="text-sm text-muted-foreground">No projects yet. Add a project with NameProjek and RepoUrl in Supabase.</p>
      )}
      {savedJob && !result && (
        <p className="text-sm">Saved job: {savedJob.status}. Refresh to check for a completed result.</p>
      )}
      {previousJobId && !result && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm">
          <p className="font-semibold text-amber-800">Reviewer requested changes</p>
          <p className="mt-1 whitespace-pre-wrap text-amber-700">{previousFeedback === undefined ? "Loading feedback..." : previousFeedback ?? "No requested changes were found for the previous job; submitting will be rejected."}</p>
          <p className="mt-2 text-xs text-amber-700/80">Bob receives this feedback and the previous patch, then produces a new fix for review.</p>
        </div>
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
          {/* Status card: what happened, what it means, and what to do next */}
          {(() => {
            const rounds = savedJob?.history ?? [];
            const index = rounds.findIndex(round => round.id === result.jobId);
            const approved = rounds.find(round => round.review_status === "APPROVED");
            const latest = rounds.at(-1);
            const supersededBy = approved && approved.id !== result.jobId ? approved : undefined;
            const newer = !supersededBy && latest && index >= 0 && latest.id !== result.jobId ? latest : undefined;
            const state = roundState(result.status, result.review?.status ?? rounds[index]?.review_status ?? null);
            const roundNumber = (job: { id: string }) => rounds.findIndex(round => round.id === job.id) + 1;
            const title = supersededBy ? "Earlier attempt · issue already resolved" : newer ? "Earlier attempt · a newer round exists" : state.label;
            const tone = supersededBy ? TONE_CLASS.success : newer ? TONE_CLASS.muted : TONE_CLASS[state.tone];
            const meaning = supersededBy
              ? `This round ended as "${state.label}", but round ${roundNumber(supersededBy)} fixed the issue and was approved and published to GitHub.`
              : newer ? `This is round ${index + 1}. Bob already ran again: round ${roundNumber(newer)} is "${roundState(newer.status, newer.review_status).label}".`
              : state.meaning;
            const next = supersededBy ? "Nothing to do here. Open the approved round to see the published fix."
              : newer ? "Open the latest round to continue." : state.next;
            const target = supersededBy ?? newer;
            return (
              <div className={`rounded-xl border p-4 space-y-2 ${tone}`}>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className="text-base font-bold">{title}</p>
                  <span className="text-xs opacity-80">
                    Issue #{result.issueId}{index >= 0 && ` · round ${index + 1} of ${rounds.length}`}
                  </span>
                </div>
                <p className="text-sm">{meaning}</p>
                <p className="text-sm"><span className="font-semibold">Next: </span>{next}</p>
                {!target && state.key === "published" && result.review?.commitUrl && (
                  <a href={result.review.commitUrl} target="_blank" rel="noopener noreferrer" className="inline-block text-sm font-semibold underline">
                    View the published commit on GitHub →
                  </a>
                )}
                {target && reviewOnly && (
                  <Link href={`${basePath}?job=${encodeURIComponent(target.id)}`} className="inline-block text-sm font-semibold underline">
                    Open round {roundNumber(target)} →
                  </Link>
                )}
                {result.bobTaskId && <p className="text-[11px] opacity-70">Bob task ID: {result.bobTaskId}</p>}
              </div>
            );
          })()}

          {/* Iterations: review rounds for this issue and self-correction inside this run */}
          {(() => {
            const rounds = savedJob?.history ?? [];
            const current = rounds.findIndex(round => round.id === result.jobId);
            const stats = validationStats(result.activity);
            if (!rounds.length && !stats.testRuns && !stats.buildRuns) return null;
            return (
              <Section title="Iterations">
                {current >= 0 && <p className="text-sm font-medium">Review round {current + 1} of {rounds.length} for issue #{result.issueId}</p>}
                {(stats.testRuns > 0 || stats.buildRuns > 0) && (
                  <p className="text-xs text-muted-foreground">
                    In this run Bob ran tests {stats.testRuns}× and the build {stats.buildRuns}×
                    {stats.failures > 0 ? `; ${stats.failures} validation run(s) failed and Bob kept iterating.` : "."}
                  </p>
                )}
                {rounds.length > 1 && (
                  <ol className="mt-2 space-y-1.5">
                    {rounds.map((round, index) => (
                      <li key={round.id} className="text-xs">
                        <span className={round.id === result.jobId ? "font-semibold" : ""}>
                          Round {index + 1}: {roundState(round.status, round.review_status).label}
                        </span>
                        <span className="text-muted-foreground"> · {formatDateTime(round.created_at)}</span>
                        {round.id !== result.jobId && reviewOnly && (
                          <> · <Link href={`${basePath}?job=${encodeURIComponent(round.id)}`} className="underline">open</Link></>
                        )}
                        {round.feedback && <p className="mt-0.5 pl-3 italic text-muted-foreground">&ldquo;{round.feedback}&rdquo;</p>}
                      </li>
                    ))}
                  </ol>
                )}
              </Section>
            );
          })()}

          {/* What Bob found and how it validated the fix: read these before the code and the decision. */}
          {result.rootCause && (
            <Section title="Root cause">
              <p className="text-sm">{result.rootCause}</p>
            </Section>
          )}

          {/* Validation */}
          {result.validationSummary && (
            <Section title="Validation">
              <p className="text-sm">{result.validationSummary}</p>
            </Section>
          )}

          {/* Human review: code changes and the decision */}
          {result.review && (
            <Section title="Human review">
              <p className="text-sm">Review status: {result.review.status}</p>
              <p className="mt-2 text-xs text-muted-foreground">Approve saves this fix as a commit on GitHub branch {result.review.branch}. Request changes sends your feedback back to Bob for another round. Reject leaves GitHub unchanged.</p>
              <div className="mt-3 space-y-2">
                <p className="text-sm font-medium">Code changes</p>
                <PatchView patch={result.review.patch} />
              </div>
              {result.review.commitUrl && <a href={result.review.commitUrl} target="_blank" rel="noopener noreferrer" className="mt-3 block text-sm underline">View approved commit on GitHub</a>}
              {result.review.error && <p role="alert" className="mt-2 text-sm text-destructive">{result.review.error}</p>}
              {["PENDING", "PUBLISH_FAILED"].includes(result.review.status) && (
                <div className="mt-4 space-y-3">
                  <div className="flex gap-3">
                    <button type="button" disabled={reviewLoading} onClick={() => void reviewFix("approve")}
                      className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50">{reviewLoading ? "Saving decision..." : "Approve & save to GitHub"}</button>
                    <button type="button" disabled={reviewLoading || result.review.status !== "PENDING"} onClick={() => void reviewFix("reject")}
                      className="rounded-md border px-4 py-2 text-sm disabled:opacity-50">Reject</button>
                  </div>
                  {result.review.status === "PUBLISH_FAILED" && <p className="text-xs text-muted-foreground">Retry approval to reconcile the GitHub branch before making another decision.</p>}
                  {result.review.status === "PENDING" && (
                    <div className="space-y-2 border-t pt-3">
                      <label className="block text-sm">What should Bob change?
                        <textarea value={feedback} onChange={event => setFeedback(event.target.value)} maxLength={2000} rows={3}
                          placeholder="e.g. Also trim whitespace from the email and add a test for it."
                          className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm" disabled={reviewLoading} />
                      </label>
                      <button type="button" disabled={reviewLoading || !feedback.trim()} onClick={() => void reviewFix("request_changes")}
                        className="rounded-md border border-amber-300 px-4 py-2 text-sm text-amber-800 disabled:opacity-50">Request changes</button>
                    </div>
                  )}
                </div>
              )}
              {result.review.status === "CHANGES_REQUESTED" && (
                <div className="mt-4 space-y-3 rounded-md border border-amber-200 bg-amber-50 p-3">
                  <p className="text-sm font-semibold text-amber-800">Changes requested</p>
                  {result.review.feedback && <p className="whitespace-pre-wrap text-sm text-amber-700">{result.review.feedback}</p>}
                  {reviewOnly && result.jobId && result.jobId === savedJob?.history?.at(-1)?.id && (
                    <Link href={`${basePath}?issue=${encodeURIComponent(result.issueId)}&previousJob=${encodeURIComponent(result.jobId)}`}
                      className="inline-block rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">
                      Run Bob with this feedback
                    </Link>
                  )}
                </div>
              )}
            </Section>
          )}
          {reviewOnly && result.issueId && !result.review && result.jobId === savedJob?.history?.at(-1)?.id &&
            !savedJob?.history?.some(round => round.review_status === "APPROVED") &&
            ["READY_FOR_REVIEW", "FAILED", "NEEDS_HUMAN_INTERVENTION"].includes(result.status) && (
            <Link href={`${basePath}?issue=${encodeURIComponent(result.issueId)}`}
              className="inline-block rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">
              Run Bob again for issue #{result.issueId}
            </Link>
          )}
          {/* Reason (human intervention / failure) */}
          {result.reason && (
            <Section title={result.status === "NEEDS_HUMAN_INTERVENTION" ? "Why human intervention is needed" : "Reason"}>
              <p className="text-sm">{result.reason}</p>
              {/Bob Shell executable not found|Cannot start Bob Shell|Node\.js 24|Upgrade Bob Shell|BOB_SHELL_EXECUTABLE|Configure BOB_API_KEY/i.test(result.reason) && (
                <div className="mt-3 space-y-2">
                  <Link href="/developer/setup" className="inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/80">
                    Install / Set up Bob
                  </Link>
                  <p className="text-xs text-muted-foreground">Complete setup, then return here to run Bob again.</p>
                </div>
              )}
              {explainReason(result.reason) && <p className="mt-2 text-xs text-muted-foreground">In plain words: {explainReason(result.reason)}</p>}
              {result.status === "NEEDS_HUMAN_INTERVENTION" && (
                <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs">
                  <p className="font-semibold text-amber-800">Continue in IBM Bob IDE</p>
                  <p className="mt-1 text-amber-700">
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

          {/* Changed files (the per-file diff above already lists them when a review exists) */}
          {!result.review && result.changedFiles.length > 0 && (
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
            <details className="rounded-md border border-border bg-muted/30">
              <summary className="cursor-pointer px-3 py-2 text-sm font-semibold select-none">
                Agent activity ({result.activity.length} events)
              </summary>
              <ol className="space-y-1 px-3 pb-3">
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
            </details>
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
