"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Bot,
  Calendar,
  CheckCircle2,
  CircleDashed,
  ClipboardList,
  ExternalLink,
  FileCode2,
  FolderOpen,
  GitBranch,
  MessageSquareWarning,
  Tag,
  User,
} from "lucide-react";
import { issueStatus, type WorkspaceJob } from "@/components/layout/use-workspace";
import { formatDateTime } from "@/lib/utils";
import type { BobProject, BobReviewStatus } from "@/types/bob";

interface Round {
  id: string; status: string; review_status: string | null; created_at: string; finished_at: string | null;
  fix_branch: string | null; published_commit_url: string | null;
  root_cause: string | null; validation: string | null; reason: string | null; feedback: string | null;
  changed_files: string[] | null;
}
interface Detail { issue: Record<string, string | null>; rounds: Round[]; project: BobProject | null }

// ─── Workflow steps (PDF: Report → Triage → Bob → Review → Resolve) ──────────
const STEPS = ["Reported", "Triaged", "Bob investigating", "Ready for review", "Resolved"] as const;

function currentStep(detail: Detail) {
  const latest = detail.rounds.at(-1);
  const job: WorkspaceJob | undefined = latest && { id: latest.id, issue_id: detail.issue.id ?? "", status: latest.status,
    review_status: latest.review_status as BobReviewStatus | null, created_at: latest.created_at, finished_at: latest.finished_at };
  const state = issueStatus(job, detail.issue.status ?? undefined);
  if (state === "RESOLVED") return 4;
  if (state === "PENDING_REVIEW") return 3;
  if (state === "IN_PROGRESS" || detail.rounds.length) return 2;
  if (detail.issue.severity || detail.issue.status === "triaged") return 1;
  return 0;
}

const SEVERITY_STYLE: Record<string, string> = {
  critical: "text-red-600 bg-red-50 border-red-200",
  high: "text-[#b56e36] bg-[#ce8f5a]/10 border-[#ce8f5a]/30",
  medium: "text-yellow-700 bg-yellow-50 border-yellow-100",
  low: "text-slate-500 bg-slate-50 border-slate-200",
};
const PRIORITY_LABEL: Record<string, string> = { urgent: "P0 Urgent", high: "P1 High", medium: "P2 Medium", low: "P3 Low" };

function roundLabel(round: Round) {
  if (round.review_status === "APPROVED") return { text: "Approved & published", tone: "text-[#2c7a6e] bg-[#80c8bc]/10 border-[#80c8bc]/30" };
  if (round.review_status === "CHANGES_REQUESTED") return { text: "Changes requested", tone: "text-amber-700 bg-amber-50 border-amber-200" };
  if (round.review_status === "REJECTED") return { text: "Rejected", tone: "text-slate-500 bg-slate-50 border-slate-200" };
  if (round.status === "READY_FOR_REVIEW") return { text: round.review_status ? "Awaiting review" : "Ready (no saved patch)", tone: "text-[#b87643] bg-[#ce8f5a]/10 border-[#ce8f5a]/30" };
  if (round.status === "FAILED") return { text: "Failed", tone: "text-red-600 bg-red-50 border-red-100" };
  if (round.status === "NEEDS_HUMAN_INTERVENTION") return { text: "Needs human intervention", tone: "text-amber-700 bg-amber-50 border-amber-200" };
  return { text: "In progress", tone: "text-[#449199] bg-[#5ec0ca]/10 border-[#5ec0ca]/30" };
}

function Card({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2">
        <Icon className="w-4 h-4 text-[#5ec0ca]" />
        <h2 className="text-sm font-bold text-[#6287a2]">{title}</h2>
      </div>
      <div className="px-5 py-4 space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">{label}</p>
      {children}
    </div>
  );
}

export default function IssueDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(`/api/issues/${encodeURIComponent(id)}`, { cache: "no-store", signal: controller.signal });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "Cannot load issue.");
        setDetail(body); setError("");
      } catch (cause) {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Cannot load issue.");
      }
    }
    void load();
    // Bob rounds can finish while the page is open.
    const timer = setInterval(() => void load(), 15000);
    return () => { controller.abort(); clearInterval(timer); };
  }, [id]);

  const back = (
    <Link href="/issues" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-[#5ec0ca] transition-colors">
      <ArrowLeft className="w-4 h-4" /> Back to My Issues
    </Link>
  );

  if (error) return <div className="space-y-4">{back}<p role="alert" className="text-red-600">{error}</p></div>;
  if (!detail) return <div className="space-y-4">{back}<p className="text-slate-400">Loading issue...</p></div>;

  const { issue, rounds, project } = detail;
  const step = currentStep(detail);
  const latest = rounds.at(-1);

  return (
    <div className="space-y-6 max-w-5xl">
      {back}

      {/* ── Header ── */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md">#{issue.id}</span>
          {issue.severity ? (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${SEVERITY_STYLE[issue.severity] ?? SEVERITY_STYLE.low}`}>
              {issue.severity.charAt(0).toUpperCase() + issue.severity.slice(1)}
            </span>
          ) : (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md border text-slate-400 bg-slate-50 border-slate-200">Untriaged</span>
          )}
          {issue.priority && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md border text-slate-500 border-slate-200">{PRIORITY_LABEL[issue.priority] ?? issue.priority}</span>
          )}
          {issue.category_issues && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border text-[#449199] bg-[#5ec0ca]/5 border-[#5ec0ca]/20">
              <Tag className="w-3 h-3" />{issue.category_issues}
            </span>
          )}
        </div>
        <h1 className="text-2xl font-bold text-slate-700 leading-snug">{issue.title}</h1>
        <div className="flex items-center gap-5 flex-wrap mt-3 text-xs text-slate-400">
          <span className="flex items-center gap-1"><FolderOpen className="w-3.5 h-3.5" />{project?.name ?? `Project ${issue.project_id}`}</span>
          <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" />{issue.reporter_name || issue.reporter_id || "Team"}</span>
          <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />Reported {formatDateTime(issue.created_at)}</span>
          {issue.updated_at && issue.updated_at !== issue.created_at && (
            <span className="flex items-center gap-1">Updated {formatDateTime(issue.updated_at)}</span>
          )}
        </div>

        {/* ── Workflow progress ── */}
        <ol className="mt-6 grid grid-cols-5 gap-2">
          {STEPS.map((label, index) => {
            const done = index < step || step === 4;
            const active = index === step && step !== 4;
            return (
              <li key={label} className="flex flex-col gap-1.5">
                <span className={`h-1.5 rounded-full ${done ? "bg-[#80c8bc]" : active ? "bg-[#5ec0ca] animate-pulse" : "bg-slate-100"}`} />
                <span className={`text-[11px] font-semibold ${done ? "text-[#2c7a6e]" : active ? "text-[#449199]" : "text-slate-300"}`}>{label}</span>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ── Report ── */}
        <div className="lg:col-span-3 space-y-6">
          <Card title="Bug report" icon={ClipboardList}>
            <Field label="Description">
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{issue.description}</p>
            </Field>
            {issue.expected_behavior && (
              <Field label="Expected behavior">
                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{issue.expected_behavior}</p>
              </Field>
            )}
            {issue.actual_behavior && (
              <Field label="Actual behavior">
                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{issue.actual_behavior}</p>
              </Field>
            )}
            {issue.error_log && (
              <Field label="Error log">
                <pre className="bg-zinc-50 border border-slate-100 rounded-lg p-3 text-xs text-[#b56e36] font-mono whitespace-pre-wrap max-h-60 overflow-auto">{issue.error_log}</pre>
              </Field>
            )}
          </Card>

          {/* ── Bob rounds ── */}
          <Card title={`IBM Bob resolution${rounds.length ? ` · ${rounds.length} round${rounds.length > 1 ? "s" : ""}` : ""}`} icon={Bot}>
            {rounds.length === 0 ? (
              <p className="flex items-center gap-2 text-sm text-slate-400">
                <CircleDashed className="w-4 h-4" /> This issue has not been assigned to Bob yet.
              </p>
            ) : (
              <ol className="space-y-4">
                {[...rounds].reverse().map((round, reversedIndex) => {
                  const label = roundLabel(round);
                  const number = rounds.length - reversedIndex;
                  return (
                    <li key={round.id} className="border border-slate-100 rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-sm font-bold text-slate-600">Round {number}</span>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${label.tone}`}>{label.text}</span>
                          <span className="text-[11px] text-slate-400">{formatDateTime(round.created_at)}</span>
                        </div>
                      </div>
                      {round.root_cause && (
                        <Field label="Root cause"><p className="text-sm text-slate-600">{round.root_cause}</p></Field>
                      )}
                      {round.reason && (
                        <Field label="Reason"><p className="text-sm text-slate-600">{round.reason}</p></Field>
                      )}
                      {round.validation && (
                        <Field label="Validation"><p className="text-sm text-slate-600">{round.validation}</p></Field>
                      )}
                      {!!round.changed_files?.length && (
                        <Field label="Changed files">
                          <ul className="space-y-0.5">
                            {round.changed_files.map(file => (
                              <li key={file} className="flex items-center gap-1.5 font-mono text-xs text-slate-500"><FileCode2 className="w-3 h-3" />{file}</li>
                            ))}
                          </ul>
                        </Field>
                      )}
                      {round.feedback && (
                        <div className="flex items-start gap-2 rounded-md bg-amber-50 border border-amber-100 px-3 py-2">
                          <MessageSquareWarning className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <p className="text-xs text-amber-800"><span className="font-semibold">Reviewer:</span> {round.feedback}</p>
                        </div>
                      )}
                      <div className="flex items-center gap-4 flex-wrap text-xs">
                        {round.fix_branch && (
                          <span className="flex items-center gap-1 font-mono text-slate-400"><GitBranch className="w-3 h-3" />{round.fix_branch}</span>
                        )}
                        {round.published_commit_url && (
                          <a href={round.published_commit_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[#2c7a6e] font-semibold hover:underline">
                            <CheckCircle2 className="w-3 h-3" /> View published commit <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                        <Link href={`/developer/bob-tasks?job=${encodeURIComponent(round.id)}`} className="text-[#449199] hover:underline">
                          Open in developer review →
                        </Link>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </Card>
        </div>

        {/* ── Side: summary ── */}
        <div className="lg:col-span-2 space-y-6">
          <Card title="Triage" icon={Tag}>
            <dl className="grid grid-cols-2 gap-y-3 text-sm">
              <dt className="text-slate-400">Category</dt><dd className="text-slate-700 font-medium">{issue.category_issues || "—"}</dd>
              <dt className="text-slate-400">Severity</dt><dd className="text-slate-700 font-medium capitalize">{issue.severity || "Untriaged"}</dd>
              <dt className="text-slate-400">Priority</dt><dd className="text-slate-700 font-medium">{issue.priority ? PRIORITY_LABEL[issue.priority] ?? issue.priority : "—"}</dd>
              <dt className="text-slate-400">Status</dt><dd className="text-slate-700 font-medium">{(issue.status || "reported").replaceAll("_", " ")}</dd>
            </dl>
          </Card>
          <Card title="Repository" icon={GitBranch}>
            <dl className="space-y-3 text-sm">
              <div><dt className="text-slate-400 text-xs">Project</dt><dd className="text-slate-700 font-medium">{project?.name ?? "—"}</dd></div>
              <div><dt className="text-slate-400 text-xs">Repository</dt><dd className="text-slate-600 font-mono text-xs break-all">{project?.repoUrl ?? "—"}</dd></div>
              <div><dt className="text-slate-400 text-xs">Base branch</dt><dd className="text-slate-600 font-mono text-xs">{project?.defaultBranch ?? "—"}</dd></div>
            </dl>
          </Card>
          {latest && (
            <Link href={`/developer/bob-tasks?job=${encodeURIComponent(latest.id)}`}
              className="flex items-center justify-center gap-2 rounded-xl bg-[#5ec0ca] hover:bg-[#4baab4] text-white text-sm font-bold py-3 transition-colors">
              <Bot className="w-4 h-4" /> Open latest Bob result
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
