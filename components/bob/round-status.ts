// Human-readable state of one Bob run (a review round) and of an issue across its rounds.
// Shared by the Bob Resolution queue and the review panel so labels and next steps always match.

export type Tone = "running" | "review" | "success" | "danger" | "warning" | "muted";

export interface RoundState {
  key: string;
  label: string;
  tone: Tone;
  /** What happened, in plain words. */
  meaning: string;
  /** What the developer should do next. */
  next: string;
}

const RUNNING = ["QUEUED", "CLONING", "INVESTIGATING", "FIXING", "VALIDATING"];

export function roundState(status: string, reviewStatus: string | null | undefined): RoundState {
  if (reviewStatus === "APPROVED") return { key: "published", label: "Published to GitHub", tone: "success",
    meaning: "A reviewer approved this fix and DevResolve committed it to a fix branch on GitHub.",
    next: "Open a pull request from the fix branch and merge it. Nothing else is needed in DevResolve." };
  if (reviewStatus === "PUBLISHING") return { key: "publishing", label: "Publishing to GitHub", tone: "running",
    meaning: "The fix was approved and is being committed to GitHub.", next: "Wait a moment and refresh." };
  if (reviewStatus === "PUBLISH_FAILED") return { key: "publish-failed", label: "Publish failed", tone: "danger",
    meaning: "The fix was approved, but committing it to GitHub failed.", next: "Check the error below and approve again to retry." };
  if (reviewStatus === "CHANGES_REQUESTED") return { key: "changes", label: "Changes requested", tone: "warning",
    meaning: "A reviewer asked Bob to improve this fix before approving it.", next: "Run Bob with the feedback to produce the next round." };
  if (reviewStatus === "REJECTED") return { key: "rejected", label: "Rejected", tone: "muted",
    meaning: "A reviewer rejected this fix. GitHub was not changed.", next: "Run Bob again, or handle the issue manually." };
  if (status === "READY_FOR_REVIEW" && reviewStatus === "PENDING") return { key: "review", label: "Awaiting your review", tone: "review",
    meaning: "Bob fixed the bug and the tests and build passed.", next: "Review the code changes, then approve, request changes, or reject." };
  if (status === "READY_FOR_REVIEW") return { key: "no-patch", label: "Finished (no saved patch)", tone: "muted",
    meaning: "Bob reported a fix, but this older run did not save the code changes, so it cannot be published.", next: "Run Bob again to get a reviewable fix." };
  if (status === "NEEDS_HUMAN_INTERVENTION") return { key: "human", label: "Needs human input", tone: "warning",
    meaning: "Bob stopped because the fix needs a decision it should not make alone.", next: "Read Bob's reason below, decide, then fix it manually or run Bob again with clearer details." };
  if (RUNNING.includes(status)) return { key: "running", label: "Bob is working", tone: "running",
    meaning: "Bob is investigating and fixing the bug in a temporary copy of the repository.", next: "Wait for the run to finish; this page refreshes automatically." };
  return { key: "failed", label: "Bob could not finish", tone: "danger",
    meaning: "This run ended without a validated fix.", next: "Read the reason below, then run Bob again." };
}

export const TONE_CLASS: Record<Tone, string> = {
  running: "bg-[#5ec0ca]/10 text-[#449199] border-[#5ec0ca]/30",
  review: "bg-amber-50 text-amber-700 border-amber-200",
  success: "bg-[#80c8bc]/15 text-[#2c7a6e] border-[#80c8bc]/40",
  danger: "bg-red-50 text-red-600 border-red-200",
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  muted: "bg-slate-50 text-slate-500 border-slate-200",
};

/** Plain-language versions of the runner's technical failure reasons. */
export function explainReason(reason: string | undefined) {
  if (!reason) return undefined;
  if (/latest observed test\/build command failed/i.test(reason))
    return "Bob's summary said the fix passed, but the last test or build Bob actually ran failed, so DevResolve did not accept the fix.";
  if (/produced no output for/i.test(reason)) return "Bob stopped responding (no output for several minutes), so the run was cancelled.";
  if (/timed out/i.test(reason)) return "The run took longer than the time limit and was cancelled.";
  if (/no code changes/i.test(reason)) return "Bob finished without changing any code; the bug may already be fixed on this branch.";
  if (/did not produce the required final summary/i.test(reason)) return "Bob ended without the final summary DevResolve needs to judge the result.";
  return undefined;
}

/** Summary of an issue across all its rounds (jobs newest first or any order). */
export function issueOutcome<J extends { id: string; status: string; review_status: string | null; created_at: string }>(jobs: J[]) {
  const ordered = [...jobs].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const approved = ordered.find(job => job.review_status === "APPROVED");
  const latest = ordered.at(-1);
  return { rounds: ordered, latest, approved, resolved: Boolean(approved) };
}
