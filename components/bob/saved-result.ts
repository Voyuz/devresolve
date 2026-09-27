import type { BobStoredJob, BobResolveResult } from "../../types/bob.ts";

export function isRunningJob(status: string) {
  return ["QUEUED", "CLONING", "INVESTIGATING", "FIXING", "VALIDATING"].includes(status);
}

// The row status is authoritative; result can contain only interim metadata.
export function resultFromJob(job: BobStoredJob): BobResolveResult | null {
  if (!job.result && !isRunningJob(job.status)) return null;
  const stored = (job.result ?? {}) as Partial<BobResolveResult>;
  return { ...stored, jobId: job.id, issueId: job.issue_id, status: job.status,
    changedFiles: stored.changedFiles ?? [], activity: stored.activity ?? [] };
}
