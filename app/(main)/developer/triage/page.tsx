"use client";

import React, { useState } from "react";
import {
  AlertTriangle,
  Bug,
  Clock,
  FileText,
  Server,
  Cpu,
  User,
  Flag,
  Inbox,
  ChevronDown,
  Sparkles,
  Loader2,
  Wand2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useWorkspace } from "@/components/layout/use-workspace";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { formatDateTime } from "@/lib/utils";
import { PRIORITY_LEVELS, SEVERITY_LEVELS, type PriorityLevel, type SeverityLevel, type TriageResult } from "@/types/issues";

// --- TYPES ---
type AssignTarget = "bob" | "human" | null;

interface RawIssue {
  id: string;
  client: string;
  title: string;
  description: string;
  expected: string | null;
  actual: string | null;
  errorLog: string | null;
  severity: SeverityLevel | null;
  priority: PriorityLevel | null;
  module: string;
  repo: string;
  reportedAt: string;
  reportedBy: string;
  assignedTo: AssignTarget;
}

const SEVERITY_STYLE: Record<SeverityLevel, string> = {
  critical: "bg-red-50 text-red-600 border border-red-200",
  high: "bg-[#ce8f5a]/15 text-[#b56e36] border border-[#ce8f5a]/40",
  medium: "bg-[#efd199]/20 text-[#b38f45] border border-[#efd199]/50",
  low: "bg-[#6287a2]/10 text-[#50728a] border border-[#6287a2]/30",
};
const PRIORITY_LABEL: Record<PriorityLevel, string> = { urgent: "P0 Urgent", high: "P1 High", medium: "P2 Medium", low: "P3 Low" };
const rank = <T extends string>(levels: readonly T[], value: T | null) => (value ? levels.indexOf(value) : -1);
const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

function SeverityBadge({ severity }: { severity: SeverityLevel | null }) {
  if (!severity)
    return (
      <Badge className="bg-slate-50 text-slate-400 border border-slate-200 shadow-none font-semibold text-xs">
        Untriaged
      </Badge>
    );
  return <Badge className={`${SEVERITY_STYLE[severity]} shadow-none font-semibold text-xs`}>{capitalize(severity)}</Badge>;
}

function PriorityBadge({ priority }: { priority: PriorityLevel | null }) {
  if (!priority) return null;
  return (
    <Badge variant="outline" className="border-slate-200 text-slate-500 shadow-none font-semibold text-xs">
      {PRIORITY_LABEL[priority]}
    </Badge>
  );
}

function TriageNote({ result }: { result: TriageResult }) {
  return (
    <div className="mt-2 flex items-start gap-1.5 text-xs">
      {result.source === "bob" ? (
        <Sparkles className="w-3.5 h-3.5 text-[#5ec0ca] shrink-0 mt-0.5" />
      ) : (
        <Wand2 className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
      )}
      <p className="text-slate-500 leading-relaxed">
        <span className="font-semibold text-slate-600">
          {result.source === "bob" ? "Triaged by IBM Bob" : "Triaged by keyword rules"}
        </span>
        {result.fallbackReason && <span className="text-[#b56e36]"> (Bob unavailable: {result.fallbackReason})</span>}
        {result.rationale && <> — {result.rationale}</>}
      </p>
    </div>
  );
}

export default function IssueTriagePage() {
  const workspace = useWorkspace();
  const router = useRouter();
  const issues: RawIssue[] = workspace.issues.map(issue => ({
    id: issue.id, title: issue.title, description: issue.description,
    expected: issue.expected_behavior, actual: issue.actual_behavior ?? null, errorLog: issue.error_log ?? null,
    client: workspace.projects.find(project => project.id === issue.ProjekId)?.name || issue.ProjekId,
    repo: workspace.projects.find(project => project.id === issue.ProjekId)?.repoUrl || "",
    severity: (issue.severity as SeverityLevel | null) ?? null, priority: (issue.priority as PriorityLevel | null) ?? null,
    module: issue.CategoryIssues, reportedAt: formatDateTime(issue.created_at),
    reportedBy: issue.ReporterName || issue.ReporterId || "Team",
    assignedTo: (() => { const job = workspace.jobs.find(job => job.issue_id === issue.id); return job && !["FAILED", "NEEDS_HUMAN_INTERVENTION"].includes(job.status) && job.review_status !== "REJECTED" ? "bob" : null; })(),
  }));
  // Modal state
  const [selectedIssue, setSelectedIssue] = useState<RawIssue | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [priorityDropdown, setPriorityDropdown] = useState<string | null>(null);
  // Triage state
  const [triaging, setTriaging] = useState<Record<string, boolean>>({});
  const [triageResults, setTriageResults] = useState<Record<string, TriageResult>>({});
  const [triageError, setTriageError] = useState("");
  const [bulkRunning, setBulkRunning] = useState(false);

  const openDetail = (issue: RawIssue) => {
    setSelectedIssue(issue);
    setIsDetailOpen(true);
  };

  const assignIssue = (id: string, target: AssignTarget) => {
    if (target === "bob") router.push("/developer/bob-tasks?issue=" + encodeURIComponent(id));
  };

  async function runTriage(id: string, engine: "bob" | "rules") {
    setTriaging(state => ({ ...state, [id]: true }));
    setTriageError("");
    try {
      const response = await fetch(`/api/issues/${encodeURIComponent(id)}/triage`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ engine }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Triage failed.");
      setTriageResults(state => ({ ...state, [id]: body.triage }));
      workspace.reload();
    } catch (error) {
      setTriageError(error instanceof Error ? error.message : "Triage failed.");
    } finally {
      setTriaging(state => ({ ...state, [id]: false }));
    }
  }

  async function autoTriageUnclassified() {
    setBulkRunning(true);
    for (const issue of issues.filter(item => !item.severity)) await runTriage(issue.id, "rules");
    setBulkRunning(false);
  }

  async function setClassification(id: string, values: { severity?: SeverityLevel; priority?: PriorityLevel }) {
    setPriorityDropdown(null);
    setTriageError("");
    try {
      const response = await fetch(`/api/issues/${encodeURIComponent(id)}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Cannot update issue.");
      workspace.reload();
    } catch (error) {
      setTriageError(error instanceof Error ? error.message : "Cannot update issue.");
    }
  }

  // Most urgent first; untriaged reports last so they stand out as a group.
  const byUrgency = (a: RawIssue, b: RawIssue) =>
    rank(PRIORITY_LEVELS, b.priority) - rank(PRIORITY_LEVELS, a.priority) ||
    rank(SEVERITY_LEVELS, b.severity) - rank(SEVERITY_LEVELS, a.severity);
  const unassigned = issues.filter((i) => i.assignedTo === null).sort(byUrgency);
  const assigned = issues.filter((i) => i.assignedTo !== null);
  const untriagedCount = issues.filter((i) => !i.severity).length;

  return (
    <div className="space-y-6">
      {workspace.error && <p role="alert" className="text-red-600">{workspace.error}</p>}
      {triageError && <p role="alert" className="text-red-600 text-sm">{triageError}</p>}
      {workspace.loading && <p>Loading reports...</p>}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#6287a2] flex items-center gap-2">
            <Inbox className="text-[#5ec0ca] w-6 h-6" />
            Issue Inbox
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Triage raw bug reports with IBM Bob, adjust severity and priority, then assign to Bob AI
          </p>
        </div>
        <div className="flex items-center gap-3">
          {untriagedCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              disabled={bulkRunning}
              onClick={() => void autoTriageUnclassified()}
              title="Classify every untriaged report with keyword rules (instant, no Bobcoins)"
              className="border-slate-200 text-slate-600 text-xs gap-1.5"
            >
              {bulkRunning ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
              Auto-triage {untriagedCount} untriaged
            </Button>
          )}
          <Badge className="bg-[#ce8f5a]/10 text-[#b56e36] border border-[#ce8f5a]/30 font-semibold gap-1.5 text-xs">
            <span className="w-2 h-2 rounded-full bg-[#ce8f5a] animate-pulse" />
            {unassigned.length} Unassigned
          </Badge>
        </div>
      </div>

      {/* Unassigned Issues */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-[#6287a2] flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[#ce8f5a]" /> Unassigned Reports
          </h2>
          <span className="text-xs text-slate-400">Sorted by priority, then severity</span>
        </div>

        {unassigned.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-slate-400 gap-2">
            <Bug className="w-8 h-8 opacity-40" />
            <p className="text-sm font-medium">All issues have been assigned</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {unassigned.map((issue) => (
              <div key={issue.id} className="px-5 py-4 hover:bg-slate-50/60 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  {/* Left: info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-bold text-[#efd199] text-sm font-mono">{issue.id}</span>
                      <SeverityBadge severity={issue.severity} />
                      <PriorityBadge priority={issue.priority} />
                      <span className="text-xs text-slate-400">{issue.client}</span>
                    </div>
                    <p className="text-slate-800 font-semibold text-sm leading-snug mb-1">{issue.title}</p>
                    <div className="flex items-center gap-4 flex-wrap mt-1.5">
                      <span className="flex items-center gap-1 text-xs text-slate-400">
                        <FileText className="w-3 h-3 text-[#6287a2]" />{issue.module}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-slate-400">
                        <Clock className="w-3 h-3 text-[#6287a2]" />{issue.reportedAt}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-slate-400">
                        <Server className="w-3 h-3 text-[#6287a2]" />{issue.repo}
                      </span>
                    </div>
                    {triageResults[issue.id] && <TriageNote result={triageResults[issue.id]} />}
                  </div>

                  {/* Right: actions */}
                  <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                    {/* AI triage */}
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={triaging[issue.id]}
                      onClick={() => void runTriage(issue.id, "bob")}
                      title="Classify category, severity, and priority with IBM Bob (one short, tool-less Bob call)"
                      className="border-[#5ec0ca]/50 text-[#449199] hover:bg-[#5ec0ca]/5 text-xs gap-1"
                    >
                      {triaging[issue.id] ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                      {triaging[issue.id] ? "Triaging..." : "Triage with Bob"}
                    </Button>

                    {/* Set Priority dropdown */}
                    <div className="relative">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPriorityDropdown(priorityDropdown === issue.id ? null : issue.id)}
                        className="border-slate-200 text-slate-500 hover:bg-slate-50 text-xs gap-1"
                      >
                        <Flag className="w-3 h-3" /> Set Priority <ChevronDown className="w-3 h-3" />
                      </Button>
                      {priorityDropdown === issue.id && (
                        <div className="absolute right-0 top-9 z-20 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden w-44">
                          <p className="px-4 pt-2.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Severity</p>
                          {[...SEVERITY_LEVELS].reverse().map((level) => (
                            <button
                              key={level}
                              type="button"
                              onClick={() => void setClassification(issue.id, { severity: level })}
                              className={`w-full text-left px-4 py-2 text-xs font-semibold hover:bg-slate-50 transition-colors ${
                                issue.severity === level ? "text-[#5ec0ca]" : "text-slate-600"
                              }`}
                            >
                              {capitalize(level)}
                            </button>
                          ))}
                          <p className="px-4 pt-2.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-t border-slate-100">Priority</p>
                          {[...PRIORITY_LEVELS].reverse().map((level) => (
                            <button
                              key={level}
                              type="button"
                              onClick={() => void setClassification(issue.id, { priority: level })}
                              className={`w-full text-left px-4 py-2 text-xs font-semibold hover:bg-slate-50 transition-colors ${
                                issue.priority === level ? "text-[#5ec0ca]" : "text-slate-600"
                              }`}
                            >
                              {PRIORITY_LABEL[level]}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Assign to Human */}
                    <Button
                      variant="outline"
                      size="sm"
                      disabled title="Human assignment is not configured"
                      className="border-[#6287a2]/40 text-[#6287a2] hover:bg-[#6287a2]/5 text-xs gap-1"
                    >
                      <User className="w-3 h-3" /> Assign to Dev
                    </Button>

                    {/* Assign to Bob AI */}
                    <Button
                      size="sm"
                      onClick={() => assignIssue(issue.id, "bob")}
                      className="bg-[#5ec0ca] hover:bg-[#4baab4] text-white font-bold border-0 text-xs gap-1"
                    >
                      <Cpu className="w-3 h-3" /> Assign to Bob AI
                    </Button>

                    {/* Detail */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openDetail(issue)}
                      className="text-slate-400 hover:text-slate-600 text-xs"
                    >
                      Details
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Already Assigned (collapsed summary) */}
      {assigned.length > 0 && (
        <div className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden opacity-70">
          <div className="px-5 py-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-400 flex items-center gap-2">
              <Checkmark /> {assigned.length} issue{assigned.length > 1 ? "s" : ""} already assigned
            </h2>
          </div>
          <div className="divide-y divide-slate-50">
            {assigned.map((issue) => (
              <div key={issue.id} className="px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-slate-400">{issue.id}</span>
                  <span className="text-sm text-slate-500">{issue.title}</span>
                  <SeverityBadge severity={issue.severity} />
                </div>
                <Badge
                  className={`text-xs font-semibold ${
                    issue.assignedTo === "bob"
                      ? "bg-[#5ec0ca]/10 text-[#449199] border border-[#5ec0ca]/30"
                      : "bg-[#6287a2]/10 text-[#50728a] border border-[#6287a2]/30"
                  }`}
                >
                  {issue.assignedTo === "bob" ? "→ Bob AI" : "→ Human Dev"}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detail Modal */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-xl bg-white border-slate-200 shadow-2xl text-slate-800 rounded-2xl overflow-hidden p-0">
          <DialogHeader className="p-6 border-b border-slate-100 bg-gradient-to-r from-[#6287a2]/5 to-slate-50">
            <div className="flex items-start justify-between gap-3">
              <div>
                <DialogTitle className="text-base font-bold flex items-center gap-2 text-[#6287a2] mb-1">
                  <Bug className="text-[#ce8f5a] w-4 h-4" />
                  {selectedIssue?.id} — Raw Report
                </DialogTitle>
                <DialogDescription className="text-slate-700 font-semibold text-sm mt-1">
                  {selectedIssue?.title}
                </DialogDescription>
              </div>
              {selectedIssue && (
                <div className="flex items-center gap-1.5">
                  <SeverityBadge severity={selectedIssue.severity} />
                  <PriorityBadge priority={selectedIssue.priority} />
                </div>
              )}
            </div>
          </DialogHeader>

          <div className="p-6 space-y-5">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Description</p>
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                {selectedIssue?.description}
              </div>
            </div>
            {selectedIssue?.expected && (
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Expected behavior</p>
                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{selectedIssue.expected}</p>
              </div>
            )}
            {selectedIssue?.actual && (
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Actual behavior</p>
                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{selectedIssue.actual}</p>
              </div>
            )}
            {selectedIssue?.errorLog && (
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Error log</p>
                <pre className="bg-zinc-50 border border-slate-100 rounded-xl p-3 text-xs text-[#b56e36] font-mono whitespace-pre-wrap max-h-48 overflow-auto">{selectedIssue.errorLog}</pre>
              </div>
            )}
            {selectedIssue && triageResults[selectedIssue.id] && <TriageNote result={triageResults[selectedIssue.id]} />}
            <div className="flex flex-wrap gap-4">
              <span className="flex items-center gap-1.5 text-xs text-slate-500">
                <Server className="w-3.5 h-3.5 text-[#6287a2]" />{selectedIssue?.repo}
              </span>
              <span className="flex items-center gap-1.5 text-xs text-slate-500">
                <FileText className="w-3.5 h-3.5 text-[#6287a2]" />
                <span className="font-mono text-[#ce8f5a]">{selectedIssue?.module}</span>
              </span>
              <span className="flex items-center gap-1.5 text-xs text-slate-500">
                <Clock className="w-3.5 h-3.5 text-[#6287a2]" />Reported {selectedIssue?.reportedAt}
              </span>
              <span className="flex items-center gap-1.5 text-xs text-slate-500">
                <User className="w-3.5 h-3.5 text-[#6287a2]" />{selectedIssue?.reportedBy}
              </span>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 p-5 border-t border-slate-100 bg-slate-50/60 rounded-b-2xl">
            <Button
              variant="outline"
              disabled title="Human assignment is not configured"
              className="border-[#6287a2]/40 text-[#6287a2] hover:bg-[#6287a2]/5 font-semibold gap-1.5"
            >
              <User className="w-4 h-4" /> Assign to Human Dev
            </Button>
            <Button
              onClick={() => selectedIssue && assignIssue(selectedIssue.id, "bob")}
              className="bg-[#5ec0ca] hover:bg-[#4baab4] text-white font-bold border-0 gap-1.5"
            >
              <Cpu className="w-4 h-4" /> Assign to Bob AI
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Checkmark() {
  return (
    <svg className="w-4 h-4 text-[#80c8bc]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}
