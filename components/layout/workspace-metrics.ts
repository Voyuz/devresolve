// Derived project/issue metrics shared by the dashboard, projects, and developer pages.
import { issueStatus, type WorkspaceIssue, type WorkspaceJob } from "@/components/layout/use-workspace";

export type ProjectUrgency = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "NONE";
export type ProjectHealth = "good" | "warning" | "critical";

const SEVERITY_RANK: Record<string, number> = { low: 1, medium: 2, high: 3, critical: 4 };
const URGENCY_FOR_RANK: ProjectUrgency[] = ["NONE", "LOW", "MEDIUM", "HIGH", "CRITICAL"];

/** Jobs arrive newest first, so the first match is the issue's latest Bob run. */
export const latestJob = (jobs: WorkspaceJob[], issueId: string) => jobs.find(job => job.issue_id === issueId);

export const stateOf = (issue: WorkspaceIssue, jobs: WorkspaceJob[]) => issueStatus(latestJob(jobs, issue.id), issue.Status);

export function projectMetrics(projectId: string, issues: WorkspaceIssue[], jobs: WorkspaceJob[]) {
  const own = issues.filter(issue => issue.ProjekId === projectId);
  const states = own.map(issue => ({ issue, state: stateOf(issue, jobs), job: latestJob(jobs, issue.id) }));
  const unresolved = states.filter(entry => entry.state !== "RESOLVED");
  const topRank = Math.max(0, ...unresolved.map(entry => SEVERITY_RANK[entry.issue.severity ?? ""] ?? (entry.issue.severity ? 0 : 1)));
  const urgency = unresolved.length ? URGENCY_FOR_RANK[Math.max(topRank, 1)] : "NONE";
  const blocked = unresolved.some(entry => entry.job && ["FAILED", "NEEDS_HUMAN_INTERVENTION"].includes(entry.job.status));
  const health: ProjectHealth = urgency === "CRITICAL" ? "critical" : urgency === "HIGH" || blocked ? "warning" : "good";
  const reportedAt = own.map(issue => issue.created_at).sort().at(-1) ?? null;
  return {
    total: own.length,
    open: states.filter(entry => entry.state === "OPEN").length,
    inProgress: states.filter(entry => entry.state === "IN_PROGRESS").length,
    pendingReview: states.filter(entry => entry.state === "PENDING_REVIEW").length,
    resolved: states.filter(entry => entry.state === "RESOLVED").length,
    critical: unresolved.filter(entry => entry.issue.severity === "critical").length,
    high: unresolved.filter(entry => entry.issue.severity === "high").length,
    untriaged: own.filter(issue => !issue.severity).length,
    urgency,
    health,
    lastReportedAt: reportedAt,
  };
}

export const URGENCY_LABEL: Record<ProjectUrgency, string> = {
  CRITICAL: "Critical", HIGH: "High", MEDIUM: "Medium", LOW: "Low", NONE: "No open issues",
};
