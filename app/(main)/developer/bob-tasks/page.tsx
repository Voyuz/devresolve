"use client";

import React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useWorkspace } from "@/components/layout/use-workspace";
import BobIssueForm from "@/components/bob/bob-issue-form";
import { formatDateTime } from "@/lib/utils";
import {
  Cpu,
  GitMerge,
  CheckCircle2,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { issueOutcome, roundState, TONE_CLASS, type RoundState } from "@/components/bob/round-status";

// --- TYPES ---
type Urgency = string | null; // issue severity: critical | high | medium | low, or null when untriaged

/** One row per issue: its latest Bob round, or the approved round once the issue is resolved. */
interface IssueTask {
  issueId: string;
  client: string;
  title: string;
  urgency: Urgency;
  /** Job shown for this issue: the approved round if any, otherwise the latest round. */
  jobId: string;
  state: RoundState;
  round: number;
  rounds: number;
  failedRounds: number;
  startedAt: string;
}

const SEVERITY_RANK: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };

function UrgencyBadge({ urgency }: { urgency: Urgency }) {
  if (urgency === "critical")
    return <Badge className="bg-red-50 text-red-600 border border-red-200 shadow-none font-semibold text-xs">Critical</Badge>;
  if (urgency === "high")
    return <Badge className="bg-[#ce8f5a]/15 text-[#b56e36] border border-[#ce8f5a]/40 shadow-none font-semibold text-xs">High</Badge>;
  if (urgency === "medium")
    return <Badge className="bg-[#efd199]/20 text-[#b38f45] border border-[#efd199]/50 shadow-none font-semibold text-xs">Medium</Badge>;
  if (urgency === "low")
    return <Badge className="bg-[#6287a2]/10 text-[#50728a] border border-[#6287a2]/30 shadow-none font-semibold text-xs">Low</Badge>;
  return <Badge className="bg-slate-50 text-slate-400 border border-slate-200 shadow-none font-semibold text-xs">Untriaged</Badge>;
}

function StateBadge({ state }: { state: RoundState }) {
  return <span title={state.meaning} className={`inline-flex text-xs font-semibold px-2 py-0.5 rounded-md border ${TONE_CLASS[state.tone]}`}>{state.label}</span>;
}

export default function BobResolutionPage() {
  const workspace = useWorkspace();
  const tasks: IssueTask[] = [...new Set(workspace.jobs.map(job => job.issue_id))].map(issueId => {
    const issue = workspace.issues.find(item => item.id === issueId);
    const project = workspace.projects.find(item => item.id === issue?.ProjekId);
    const outcome = issueOutcome(workspace.jobs.filter(job => job.issue_id === issueId));
    const shown = outcome.approved ?? outcome.latest!;
    return {
      issueId, client: project?.name || "Project", title: issue?.title || "Issue #" + issueId, urgency: issue?.severity ?? null,
      jobId: shown.id, state: roundState(shown.status, shown.review_status),
      round: outcome.rounds.indexOf(shown) + 1, rounds: outcome.rounds.length,
      failedRounds: outcome.rounds.filter(job => job.status === "FAILED").length, startedAt: shown.created_at,
    };
  });
  // Unresolved issues, most severe first, newest first within the same severity.
  const queue = tasks.filter(task => task.state.key !== "published")
    .sort((a, b) => (SEVERITY_RANK[b.urgency ?? ""] ?? 0) - (SEVERITY_RANK[a.urgency ?? ""] ?? 0) || b.startedAt.localeCompare(a.startedAt));
  const resolved = tasks.filter(task => task.state.key === "published").sort((a, b) => b.startedAt.localeCompare(a.startedAt));

  return (
    <div className="space-y-8">
      {workspace.error && <p role="alert" className="text-red-600">{workspace.error}</p>}
      {workspace.loading && <p>Loading Bob jobs...</p>}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#6287a2] flex items-center gap-2">
            <Cpu className="text-[#5ec0ca] w-6 h-6" />
            Bob Resolution
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Review and evaluate automated resolutions proposed by the AI Agent.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-[#5ec0ca]/10 text-[#449199] border border-[#5ec0ca]/30 font-semibold text-xs gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#5ec0ca] animate-pulse" />
            {queue.length} open
          </Badge>
          <Badge className="bg-[#80c8bc]/10 text-[#2c7a6e] border border-[#80c8bc]/30 font-semibold text-xs gap-1.5">
            <CheckCircle2 className="w-3 h-3" />
            {resolved.length} published
          </Badge>
        </div>
      </div>

      {/* Open issues */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-[#6287a2] flex items-center gap-2">
            <GitMerge className="w-4 h-4 text-[#5ec0ca]" /> Open issues
          </h2>
          <span className="text-xs text-slate-400">Sorted by urgency</span>
        </div>

        {queue.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-slate-400">
            {workspace.loading ? "Loading Bob runs..." : "No open issues with Bob runs. Assign a report from the Issue Inbox."}
          </p>
        ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-xs text-slate-400 uppercase font-bold border-b border-slate-100">
              <tr>
                <th className="px-5 py-3">Issue</th>
                <th className="px-5 py-3">Latest round</th>
                <th className="px-5 py-3">Urgency</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {queue.map((task) => (
                <tr key={task.issueId} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-5 py-4 max-w-xs">
                    <div className="text-slate-700 font-medium text-sm leading-snug">{task.title}</div>
                    <div className="flex items-center gap-1 text-xs text-[#6287a2] mt-1 opacity-80">
                      <FileText className="w-3 h-3" />Issue #{task.issueId} · {task.client}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="text-sm text-slate-600">Round {task.round} of {task.rounds}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Started {formatDateTime(task.startedAt)}{task.failedRounds > 0 && ` · ${task.failedRounds} failed`}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <UrgencyBadge urgency={task.urgency} />
                  </td>
                  <td className="px-5 py-4">
                    <StateBadge state={task.state} />
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Button
                      size="sm"
                      nativeButton={false}
                      render={<Link href={"/developer/bob-tasks?job=" + encodeURIComponent(task.jobId)} />}
                      className="bg-[#5ec0ca] hover:bg-[#4baab4] text-white font-bold border-0 gap-1.5"
                    >
                      <GitMerge className="w-3.5 h-3.5" /> {task.state.key === "review" ? "Review fix" : "Open"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </div>

      {/* Published issues */}
      {resolved.length > 0 && (
        <div className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-50 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#80c8bc]" />
            <h2 className="text-sm font-bold text-slate-500">Published fixes · merge the fix branch on GitHub</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-xs text-slate-400 uppercase font-bold border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3">Issue</th>
                  <th className="px-5 py-3">Approved round</th>
                  <th className="px-5 py-3">Urgency</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {resolved.map((task) => (
                  <tr key={task.issueId} className="text-slate-500">
                    <td className="px-5 py-3">
                      <Link href={"/developer/bob-tasks?job=" + encodeURIComponent(task.jobId)} className="text-sm font-medium text-slate-700 hover:underline">{task.title}</Link>
                      <div className="text-xs mt-0.5">Issue #{task.issueId} · {task.client}</div>
                    </td>
                    <td className="px-5 py-3 text-xs">Round {task.round} of {task.rounds}</td>
                    <td className="px-5 py-3"><UrgencyBadge urgency={task.urgency} /></td>
                    <td className="px-5 py-3"><StateBadge state={task.state} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===== REVIEW MODAL ===== */}
      <React.Suspense fallback={<p>Loading selected task...</p>}><BobTaskDetail /></React.Suspense>
    </div>
  );
}

function BobTaskDetail() {
  const params = useSearchParams();
  const selection = { job: params.get("job") || undefined, issue: params.get("issue") || undefined, previousJob: params.get("previousJob") || undefined };
  if (!selection.job && !selection.issue) return <p className="text-slate-500 text-sm">Open a result above, or select a report in the Issue Inbox to start Bob.</p>;
  return <BobIssueForm key={[selection.issue, selection.previousJob, selection.job].join("|")} jobId={selection.issue ? undefined : selection.job} issueId={selection.issue} previousJobId={selection.issue ? selection.previousJob : undefined} reviewOnly={Boolean(selection.job && !selection.issue)} basePath="/developer/bob-tasks" heading={selection.issue ? "Bob investigation" : "Developer review"} />;
}
