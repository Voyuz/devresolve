// Row shape of public.issues and its Postgres enums.

import type { ProjectSummary } from "@/types/project";

/** Postgres enum issue_status */
export type IssueStatus =
  | "reported"
  | "triaged"
  | "assigned_bob"
  | "bob_investigating"
  | "bob_fixing"
  | "bob_testing"
  | "ready_for_review"
  | "needs_human_intervention"
  | "resolved"
  | "rejected";

/** Postgres enum severity_level */
export type SeverityLevel = "low" | "medium" | "high" | "critical";

/** Postgres enum priority_level */
export type PriorityLevel = "low" | "medium" | "high" | "urgent";

/** Postgres enum app_role (public.profiles.role) */
export type AppRole = "user" | "developer";

export const ISSUE_STATUSES: readonly IssueStatus[] = [
  "reported", "triaged", "assigned_bob", "bob_investigating", "bob_fixing",
  "bob_testing", "ready_for_review", "needs_human_intervention", "resolved", "rejected",
];
export const SEVERITY_LEVELS: readonly SeverityLevel[] = ["low", "medium", "high", "critical"];
export const PRIORITY_LEVELS: readonly PriorityLevel[] = ["low", "medium", "high", "urgent"];

export interface IssueRow {
  /** bigint primary key */
  id: number;
  created_at: string;
  updated_at: string | null;
  /** bigint reference to public.projects.id */
  project_id: number;
  reporter_id: string | null;
  title: string;
  description: string;
  category_issues: string | null;
  severity: SeverityLevel | null;
  priority: PriorityLevel | null;
  status: IssueStatus;
  expected_behavior: string | null;
  actual_behavior: string | null;
  error_log: string | null;
}

export type IssueInsert = Pick<IssueRow, "project_id" | "title" | "description"> &
  Partial<Omit<IssueRow, "id" | "created_at" | "updated_at" | "project_id" | "title" | "description">>;

/** Issue item returned by GET /api/issues (legacy field names kept for existing pages). */
export interface IssueListItem {
  id: string;
  created_at: string;
  updated_at?: string | null;
  ProjekId: string;
  ReporterId: string | null;
  /** Profile name when ReporterId is a profile ID. */
  ReporterName?: string | null;
  title: string;
  description: string;
  CategoryIssues: string | null;
  Status: IssueStatus | string;
  expected_behavior: string | null;
  actual_behavior?: string | null;
  error_log?: string | null;
  screenshot_ref: string | null;
  severity?: SeverityLevel | null;
  priority?: PriorityLevel | null;
  project: ProjectSummary | null;
}

/** Categories produced by triage; stored in issues.category_issues (free text). */
export const ISSUE_CATEGORIES = [
  "Authentication", "Payment", "Checkout", "Data", "UI", "Performance", "Security", "Integration", "Other",
] as const;
export type IssueCategory = (typeof ISSUE_CATEGORIES)[number];

export type TriageSource = "bob" | "rules";

export interface TriageResult {
  category: IssueCategory;
  severity: SeverityLevel;
  priority: PriorityLevel;
  /** One-sentence explanation; returned to the UI, not stored. */
  rationale: string;
  source: TriageSource;
  /** Why Bob was not used, when source is "rules" after a Bob attempt. */
  fallbackReason?: string;
}

export interface TriageInput {
  title: string;
  description: string;
  expectedBehavior?: string | null;
  actualBehavior?: string | null;
  errorLog?: string | null;
}
