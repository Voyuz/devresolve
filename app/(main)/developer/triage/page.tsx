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

// --- TYPES ---
type Urgency = "HIGH" | "MEDIUM" | "LOW";
type AssignTarget = "bob" | "human" | null;

interface RawIssue {
  id: string;
  client: string;
  title: string;
  description: string;
  urgency: Urgency;
  module: string;
  repo: string;
  reportedAt: string;
  reportedBy: string;
  assignedTo: AssignTarget;
}




function UrgencyBadge({ urgency }: { urgency: Urgency }) {
  if (urgency === "HIGH")
    return (
      <Badge className="bg-[#ce8f5a]/15 text-[#b56e36] border border-[#ce8f5a]/40 shadow-none font-semibold text-xs">
        Critical
      </Badge>
    );
  if (urgency === "MEDIUM")
    return (
      <Badge className="bg-[#efd199]/20 text-[#b38f45] border border-[#efd199]/50 shadow-none font-semibold text-xs">
        High (P1)
      </Badge>
    );
  return (
    <Badge className="bg-[#6287a2]/10 text-[#50728a] border border-[#6287a2]/30 shadow-none font-semibold text-xs">
      Normal
    </Badge>
  );
}

export default function IssueTriagePage() {
  const workspace = useWorkspace();
  const router = useRouter();
  const issues: RawIssue[] = workspace.issues.map(issue => ({
    id: issue.id, title: issue.title, description: issue.description,
    client: workspace.projects.find(project => project.id === issue.ProjekId)?.name || issue.ProjekId,
    repo: workspace.projects.find(project => project.id === issue.ProjekId)?.repoUrl || "",
    urgency: "LOW", module: issue.CategoryIssues, reportedAt: issue.created_at,
    reportedBy: issue.ReporterId || "Team",
    assignedTo: (() => { const job = workspace.jobs.find(job => job.issue_id === issue.id); return job && !["FAILED", "NEEDS_HUMAN_INTERVENTION"].includes(job.status) && job.review_status !== "REJECTED" ? "bob" : null; })(),
  }));
  // Modal state
  const [selectedIssue, setSelectedIssue] = useState<RawIssue | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [priorityDropdown, setPriorityDropdown] = useState<string | null>(null);

  const openDetail = (issue: RawIssue) => {
    setSelectedIssue(issue);
    setIsDetailOpen(true);
  };

  const assignIssue = (id: string, target: AssignTarget) => {
    if (target === "bob") router.push("/developer/bob-tasks?issue=" + encodeURIComponent(id));
  };
  const setPriority = () => setPriorityDropdown(null);

  const unassigned = issues.filter((i) => i.assignedTo === null);
  const assigned = issues.filter((i) => i.assignedTo !== null);

  return (
    <div className="space-y-6">
      {workspace.error && <p role="alert" className="text-red-600">{workspace.error}</p>}
      {workspace.loading && <p>Loading reports?</p>}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#6287a2] flex items-center gap-2">
            <Inbox className="text-[#5ec0ca] w-6 h-6" />
            Issue Inbox
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Raw bug reports awaiting triage — assign to Bob AI or a human developer
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge className="bg-[#ce8f5a]/10 text-[#b56e36] border border-[#ce8f5a]/30 font-semibold gap-1.5 text-xs">
            <span className="w-2 h-2 rounded-full bg-[#ce8f5a] animate-pulse" />
            {unassigned.length} Unassigned
          </Badge>
        </div>
      </div>

      {/* Unassigned Issues */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-[#6287a2] flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[#ce8f5a]" /> Unassigned Reports
          </h2>
          <span className="text-xs text-slate-400">Sorted by urgency</span>
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
                      <UrgencyBadge urgency={issue.urgency} />
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
                  </div>

                  {/* Right: actions */}
                  <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                    {/* Set Priority dropdown */}
                    <div className="relative">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled title="Priority persistence is not configured"
                        className="border-slate-200 text-slate-500 hover:bg-slate-50 text-xs gap-1"
                      >
                        <Flag className="w-3 h-3" /> Set Priority <ChevronDown className="w-3 h-3" />
                      </Button>
                      {priorityDropdown === issue.id && (
                        <div className="absolute right-0 top-8 z-20 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden w-36">
                          {(["HIGH", "MEDIUM", "LOW"] as Urgency[]).map((u) => (
                            <button
                              key={u}
                              onClick={() => setPriority()}
                              className={`w-full text-left px-4 py-2.5 text-xs font-semibold hover:bg-slate-50 transition-colors ${
                                issue.urgency === u ? "text-[#5ec0ca]" : "text-slate-600"
                              }`}
                            >
                              {u === "HIGH" ? "🔴 Critical" : u === "MEDIUM" ? "🟡 High (P1)" : "🔵 Normal"}
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
              {selectedIssue && <UrgencyBadge urgency={selectedIssue.urgency} />}
            </div>
          </DialogHeader>

          <div className="p-6 space-y-5">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Description</p>
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-sm text-slate-600 leading-relaxed">
                {selectedIssue?.description}
              </div>
            </div>
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
