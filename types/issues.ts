// ── Profile (pengguna web) ──────────────────────────────────────────
export interface Profile {
  id: number;
  created_at: string;
  NamaUser: string | null;
  SandiUser: string | null;
  role: "user" | "developer";
}

// ── Issue ───────────────────────────────────────────────────────────
export type IssueStatus =
  | "open"
  | "triaged"
  | "in_progress"
  | "ready_for_review"
  | "resolved"
  | "needs_human_intervention";

export interface Issue {
  id: number;
  created_at: string;
  ProjekId: string | null;
  ReporterId: string | null;
  title: string | null;
  description: string | null;
  CategoryIssues: string | null;
  Status: IssueStatus | null;
  expected_behavior: string | null;
  screenshot_ref: string | null;
}

// ── Bob Job ─────────────────────────────────────────────────────────
export type BobJobStatus =
  | "pending"
  | "running"
  | "pass"
  | "fail"
  | "needs_human_intervention";

export interface BobJob {
  id: string;
  issue_id: number;
  status: BobJobStatus;
  repo_url: string;
  base_branch: string;
  fix_branch: string | null;
  bob_task_id: string | null;
  result: Record<string, unknown> | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
}

// ── Session (disimpan di cookie, bukan Supabase Auth) ───────────────
export interface SessionUser {
  id: number;
  NamaUser: string;
  role: "user" | "developer";
}
