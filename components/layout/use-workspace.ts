"use client";
import { useCallback, useEffect, useState } from "react";
import type { BobProject, BobReviewStatus } from "@/types/bob";
export interface WorkspaceIssue {
  id: string; created_at: string; ProjekId: string; ReporterId: string | null; ReporterName?: string | null;
  title: string; description: string; CategoryIssues: string; Status: string;
  expected_behavior: string | null; screenshot_ref: string | null;
  severity?: string | null; priority?: string | null;
  actual_behavior?: string | null; error_log?: string | null;
}
export interface WorkspaceJob {
  id: string; issue_id: string; status: string; review_status: BobReviewStatus | null;
  created_at: string; finished_at: string | null;
}
export function issueStatus(job?: WorkspaceJob, storedStatus?: string) {
  if (["RESOLVED", "CLOSED"].includes(storedStatus?.toUpperCase() || "")) return "RESOLVED";
  if (!job && storedStatus === "ready_for_review") return "PENDING_REVIEW";
  if (!job && ["assigned_bob", "bob_investigating", "bob_fixing", "bob_testing"].includes(storedStatus || "")) return "IN_PROGRESS";
  if (job?.review_status === "APPROVED") return "RESOLVED";
  if (!job || job.status === "FAILED" || job.status === "NEEDS_HUMAN_INTERVENTION" || job.review_status === "REJECTED" || job.review_status === "CHANGES_REQUESTED") return "OPEN";
  // Only jobs with a saved review artifact can be approved; legacy jobs (review_status null) cannot.
  if (job.status === "READY_FOR_REVIEW") return job.review_status ? "PENDING_REVIEW" : "OPEN";
  return "IN_PROGRESS";
}
export function useWorkspace() {
  const [data, setData] = useState<{ projects: BobProject[]; issues: WorkspaceIssue[]; jobs: WorkspaceJob[] }>({ projects: [], issues: [], jobs: [] });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch("/api/workspace", { cache: "no-store", signal: controller.signal });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "Cannot load workspace.");
        setData(body); setError("");
      } catch (error) { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "Cannot load workspace."); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }
    void load();
    const timer = setInterval(() => void load(), 15000);
    return () => { controller.abort(); clearInterval(timer); };
  }, [version]);
  // Refetch immediately (e.g. after a triage update) instead of waiting for the next poll.
  const reload = useCallback(() => setVersion(value => value + 1), []);
  return { ...data, error, loading, reload };
}
