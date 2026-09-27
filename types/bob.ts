// Bob integration types shared across the application.

export type BobJobStatus =
  | "QUEUED"
  | "CLONING"
  | "INVESTIGATING"
  | "FIXING"
  | "VALIDATING"
  | "READY_FOR_REVIEW"
  | "NEEDS_HUMAN_INTERVENTION"
  | "FAILED";

export type BobActivityEventKind =
  | "repository_loaded"
  | "reading_file"
  | "running_command"
  | "modifying_file"
  | "test_result"
  | "build_result"
  | "task_completed"
  | "error"
  | "info";

export interface BobActivityEvent {
  kind: BobActivityEventKind;
  message: string;
  timestamp: string;
  /** Optional file path relevant to this event */
  file?: string;
  /** Optional command that was run */
  command?: string;
  /** Whether this step succeeded (for result events) */
  success?: boolean;
}

export interface BobProject {
  id: string;
  name: string;
  repoUrl: string;
  defaultBranch: string;
}

export interface BobIssue {
  title: string;
  description: string;
  expectedBehavior?: string;
  actualBehavior?: string;
  errorLog?: string;
  screenshotRef?: string;
}

export interface BobResolveRequest {
  projectId: string;
  issue: BobIssue;
}

export interface BobResolveResult {
  review?: BobReview;
  jobId?: string;
  status: BobJobStatus;
  issueId: string;
  /** Populated when status is NEEDS_HUMAN_INTERVENTION or FAILED */
  reason?: string;
  /** Populated when status is READY_FOR_REVIEW or NEEDS_HUMAN_INTERVENTION */
  repoUrl?: string;
  /** The fix branch created for this issue */
  branch?: string;
  /** Bob task/session ID if captured */
  bobTaskId?: string;
  /** Changed files identified during the session */
  changedFiles: string[];
  /** Root cause summary extracted from Bob output */
  rootCause?: string;
  /** Human-readable summary of validation outcome */
  validationSummary?: string;
  /** Ordered list of observable activity from the Bob session */
  activity: BobActivityEvent[];
  /** Earlier job whose review requested the changes this run addresses */
  previousJobId?: string;
}

export interface BobArtifact {
  baseSha: string;
  createdAt: string;
  patch: string;
  files: { path: string; mode: "100644" | "100755"; content: string | null }[];
}

export type BobReviewStatus = "PENDING" | "PUBLISHING" | "APPROVED" | "REJECTED" | "PUBLISH_FAILED" | "CHANGES_REQUESTED";
export interface BobReview {
  status: BobReviewStatus;
  patch: string;
  branch: string;
  commitUrl?: string;
  error?: string;
  /** Reviewer's requested changes, when status is CHANGES_REQUESTED */
  feedback?: string;
}

/** One Bob run for an issue; runs are review rounds, oldest first. */
export interface BobJobRound {
  id: string;
  status: BobJobStatus;
  review_status: BobReviewStatus | null;
  created_at: string;
  feedback: string | null;
}

export interface BobStoredJob {
  id: string;
  issue_id: string;
  status: BobJobStatus;
  result: BobResolveResult | null;
  created_at: string;
  finished_at: string | null;
  /** All runs for the same issue, oldest first (review rounds). */
  history?: BobJobRound[];
}
