"use client";

import React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useWorkspace } from "@/components/layout/use-workspace";
import BobIssueForm from "@/components/bob/bob-issue-form";
import {
  Cpu,
  GitMerge,
  CheckCircle2,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// --- TYPES ---
type Urgency = "HIGH" | "MEDIUM" | "LOW";
type BobStatus = string;

interface FixIteration {
  attempt: number;
  explanation: string;
  fileName: string;
  changedParts: string[];
  isSuccessful: boolean;
}

interface BobTask {
  id: string;
  client: string;
  title: string;
  urgency: Urgency;
  bobStatus: BobStatus;
  module: string;
  repo: string;
  assignedAt: string;
  fixIterations: FixIteration[];
}





function UrgencyBadge({ urgency }: { urgency: Urgency }) {
  if (urgency === "HIGH")
    return <Badge className="bg-[#ce8f5a]/15 text-[#b56e36] border border-[#ce8f5a]/40 shadow-none font-semibold text-xs">Critical</Badge>;
  if (urgency === "MEDIUM")
    return <Badge className="bg-[#efd199]/20 text-[#b38f45] border border-[#efd199]/50 shadow-none font-semibold text-xs">High (P1)</Badge>;
  return <Badge className="bg-[#6287a2]/10 text-[#50728a] border border-[#6287a2]/30 shadow-none font-semibold text-xs">Unclassified</Badge>;
}

function BobStatusBadge({ status }: { status: BobStatus }) {
  return <Badge className="bg-dev-cyan/10 text-dev-slate border-dev-cyan/20">{status}</Badge>;
}

export default function BobResolutionPage() {
  const workspace = useWorkspace();
  const tasks: BobTask[] = workspace.jobs.map(job => {
    const issue = workspace.issues.find(issue => issue.id === job.issue_id);
    const project = workspace.projects.find(project => project.id === issue?.ProjekId);
    return { id: job.id, client: project?.name || "Project", title: issue?.title || "Issue #" + job.issue_id,
      urgency: "LOW", bobStatus: job.review_status === "APPROVED" ? "Published" : job.review_status === "REJECTED" ? "Rejected" : job.status,
      module: "Issue #" + job.issue_id, repo: project?.repoUrl || "", assignedAt: job.created_at, fixIterations: [] };
  });
  const queue = tasks.filter((t) => t.bobStatus !== "Published");
  const resolved = tasks.filter((t) => t.bobStatus === "Published");

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
            {queue.length} Active
          </Badge>
          <Badge className="bg-[#80c8bc]/10 text-[#2c7a6e] border border-[#80c8bc]/30 font-semibold text-xs gap-1.5">
            <CheckCircle2 className="w-3 h-3" />
            {resolved.length} Published
          </Badge>
        </div>
      </div>

      {/* Active Queue Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-[#6287a2] flex items-center gap-2">
            <GitMerge className="w-4 h-4 text-[#5ec0ca]" /> Active Tasks
          </h2>
          <span className="text-xs text-slate-400">Sorted by urgency</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-xs text-slate-400 uppercase font-bold border-b border-slate-100">
              <tr>
                <th className="px-5 py-3">Issue / Client</th>
                <th className="px-5 py-3">Description</th>
                <th className="px-5 py-3">Urgency</th>
                <th className="px-5 py-3">Bob Status</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {queue.map((task) => (
                <tr key={task.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-5 py-4">
                    <div className="font-bold text-[#efd199] font-mono text-sm">{task.id}</div>
                    <div className="text-slate-400 text-xs mt-0.5">{task.client}</div>
                  </td>
                  <td className="px-5 py-4 max-w-xs">
                    <div className="text-slate-700 font-medium text-sm leading-snug">{task.title}</div>
                    <div className="flex items-center gap-1 text-xs text-[#6287a2] mt-1 font-mono opacity-80">
                      <FileText className="w-3 h-3" />{task.module}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <UrgencyBadge urgency={task.urgency} />
                  </td>
                  <td className="px-5 py-4">
                    <BobStatusBadge status={task.bobStatus} />
                  </td>
                  <td className="px-5 py-4 text-right">
                    {(
                      <Button
                        size="sm"
                        render={<Link href={"/developer/bob-tasks?job=" + encodeURIComponent(task.id)} />}
                        className="bg-[#5ec0ca] hover:bg-[#4baab4] text-white font-bold border-0 gap-1.5"
                      >
                        <GitMerge className="w-3.5 h-3.5" /> Open Result
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Resolved Table */}
      {resolved.length > 0 && (
        <div className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden opacity-75">
          <div className="px-5 py-4 border-b border-slate-50 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#80c8bc]" />
            <h2 className="text-sm font-bold text-slate-400">Published Fixes (awaiting merge)</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-xs text-slate-400 uppercase font-bold border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3">Issue / Client</th>
                  <th className="px-5 py-3">Description</th>
                  <th className="px-5 py-3">Urgency</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {resolved.map((task) => (
                  <tr key={task.id} className="text-slate-400">
                    <td className="px-5 py-3">
                      <Link href={"/developer/bob-tasks?job=" + encodeURIComponent(task.id)} className="font-mono text-xs font-bold underline">{task.id}</Link>
                      <div className="text-xs mt-0.5">{task.client}</div>
                    </td>
                    <td className="px-5 py-3 max-w-xs text-xs">{task.title}</td>
                    <td className="px-5 py-3"><UrgencyBadge urgency={task.urgency} /></td>
                    <td className="px-5 py-3"><BobStatusBadge status={task.bobStatus} /></td>
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
  const selection = { job: params.get("job") || undefined, issue: params.get("issue") || undefined };
  if (!selection.job && !selection.issue) return <p className="text-slate-500 text-sm">Open a result above, or select a report in the Issue Inbox to start Bob.</p>;
  return <BobIssueForm key={selection.issue || selection.job} jobId={selection.issue ? undefined : selection.job} issueId={selection.issue} reviewOnly={Boolean(selection.job && !selection.issue)} basePath="/developer/bob-tasks" heading={selection.issue ? "Bob investigation" : "Developer review"} />;
}
