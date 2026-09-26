"use client";

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  TerminalSquare,
  CheckCircle2,
  Loader2,
  Cpu,
  GitMerge,
  MessageSquareWarning,
  RefreshCcw,
  FileText,
  ThumbsUp,
  CheckSquare,
  Bug,
  Clock,
  Server,
  XCircle,
  Sparkles,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

// --- TYPES & INTERFACES ---
type Urgency = 'HIGH' | 'MEDIUM' | 'LOW';
type AIStatus = 'Idle' | 'Analyzing' | 'Coding' | 'Pending Review' | 'Resolved';

interface FixIteration {
  attempt: number;
  explanation: string;
  fileName: string;
  changedParts: string[];
  isSuccessful: boolean;
}

interface Issue {
  id: string;
  client: string;
  title: string;
  urgency: Urgency;
  aiStatus: AIStatus;
  module: string;
  fixIterations: FixIteration[];
  fullDescription: string;
  repo: string;
  reportedAt: string;
}

// --- MOCK DATA ---
const initialIssues: Issue[] = [
  {
    id: "ISS-092",
    client: "FinTech Indo Ltd.",
    title: "Memory leak on payment gateway processing",
    urgency: "HIGH",
    aiStatus: "Pending Review",
    module: "payment-engine.ts",
    fullDescription: "Production server RAM usage spikes to 98% during peak hours when processing virtual account callbacks. Heap dump shows unreleased PG client connections.",
    repo: "devresolve/finpay-api",
    reportedAt: "2 hours ago",
    fixIterations: [
      {
        attempt: 1,
        explanation: "Analysis complete. The root cause of the memory leak is a database connection that is never returned to the pool after a transaction completes. I identified the pattern in the async callback chain and applied targeted fixes.",
        fileName: "payment-engine.ts",
        changedParts: [
          "Converted the main 'processPayload' function from callback-based to async/await to ensure the execution flow is sequential and predictable.",
          "Added an explicit 'req.conn.release()' call at the end of the successful transaction path to return the connection to the pool.",
          "Wrapped the release logic inside a 'finally' block so the connection is also force-released when the system catches an error, preventing any code path from leaking a connection.",
        ],
        isSuccessful: true,
      },
      {
        attempt: 2,
        explanation: "Understood. I have revised the approach based on your rejection. The previous fix only handled one connection path. I have now audited all entry points and applied a more comprehensive connection lifecycle guard.",
        fileName: "payment-engine.ts",
        changedParts: [
          "Added a connection pool middleware wrapper that automatically tracks and releases any connection opened within the request lifecycle.",
          "Removed three redundant manual connection opens found in the retry handler that were not covered by the previous fix.",
          "Added a timeout guard — any connection idle for more than 30 seconds is now automatically released to prevent silent leaks under low traffic.",
        ],
        isSuccessful: true,
      },
    ],
  },
  {
    id: "ISS-094",
    client: "E-Commerce Prime",
    title: "Cart fails to update when item out of stock",
    urgency: "HIGH",
    aiStatus: "Pending Review",
    module: "cart-service.js",
    fullDescription: "Customers are able to add items to their cart even when the product page says 0 stock. Database shows negative integer values in inventory table.",
    repo: "devresolve/minishop-ecommerce",
    reportedAt: "4 hours ago",
    fixIterations: [
      {
        attempt: 1,
        explanation: "Logic bug confirmed. The system is currently deducting stock values in the database even when the quantity is already zero, resulting in negative stock values being persisted.",
        fileName: "cart-service.js",
        changedParts: [
          "Added an 'if (item.stock <= 0)' guard at the very beginning of the 'updateCart' function before any database write occurs.",
          "Prevented the save operation from executing if stock is insufficient and returned a descriptive 'Item out of stock' error response to the client.",
          "Corrected the stock deduction formula to use the exact requested quantity instead of a rounded approximation that caused drift over multiple updates.",
        ],
        isSuccessful: true,
      },
    ],
  },
  {
    id: "ISS-088",
    client: "Logistics Corp",
    title: "API timeout during high load dispatching",
    urgency: "HIGH",
    aiStatus: "Coding",
    module: "route-api.go",
    fullDescription: "The /api/v1/dispatch endpoint is timing out (504 Gateway Timeout) when attempting to assign more than 50 drivers simultaneously. Goroutines might be deadlocking.",
    repo: "devresolve/fleet-track",
    reportedAt: "1 hour ago",
    fixIterations: [],
  },
  {
    id: "ISS-102",
    client: "Internal QA",
    title: "UI misalignment on mobile dashboard",
    urgency: "MEDIUM",
    aiStatus: "Idle",
    module: "Dashboard.tsx",
    fullDescription: "The revenue chart overlaps with the sidebar navigation when viewed on iPhone 13 Pro Max screen resolution. Flexbox wrap property seems missing.",
    repo: "devresolve/frontend-web",
    reportedAt: "Yesterday",
    fixIterations: [],
  },
  {
    id: "ISS-105",
    client: "Startup X",
    title: "Export to CSV format incorrect",
    urgency: "LOW",
    aiStatus: "Resolved",
    module: "export-utils.py",
    fullDescription: "Dates in the exported CSV report are in MM/DD/YYYY format, but the client configuration explicitly requested ISO-8601 (YYYY-MM-DD).",
    repo: "devresolve/reporting-service",
    reportedAt: "2 days ago",
    fixIterations: [
      {
        attempt: 1,
        explanation: "Date formatting mismatch identified. The export utility was using Python's default locale-based date serializer instead of the ISO-8601 standard formatter.",
        fileName: "export-utils.py",
        changedParts: [
          "Replaced the 'strftime(\"%m/%d/%Y\")' call with 'date.isoformat()' across all three export functions in the file.",
          "Added a unit test case to assert the output format matches YYYY-MM-DD before the CSV is written to disk.",
        ],
        isSuccessful: true,
      },
    ],
  },
];

// Sort issues: HIGH first, then MEDIUM, then LOW
const URGENCY_ORDER: Record<Urgency, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
const sortedInitialIssues = [...initialIssues].sort(
  (a, b) => URGENCY_ORDER[a.urgency] - URGENCY_ORDER[b.urgency]
);

export default function DeveloperDashboard() {
  const [issues, setIssues] = useState<Issue[]>(sortedInitialIssues);

  // Review modal state
  const [selectedReviewIssue, setSelectedReviewIssue] = useState<Issue | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [currentIteration, setCurrentIteration] = useState(0);
  const [isAiProcessing, setIsAiProcessing] = useState(false);

  // Details modal state
  const [selectedDetailsIssue, setSelectedDetailsIssue] = useState<Issue | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const handleReviewClick = (issue: Issue) => {
    setSelectedReviewIssue(issue);
    setCurrentIteration(0);
    setIsAiProcessing(false);
    setIsReviewModalOpen(true);
  };

  const handleDetailsClick = (issue: Issue) => {
    setSelectedDetailsIssue(issue);
    setIsDetailsModalOpen(true);
  };

  const handleRejectAndLoop = () => {
    if (!selectedReviewIssue) return;
    const nextIteration = currentIteration + 1;
    const hasNextIteration = nextIteration < selectedReviewIssue.fixIterations.length;

    setIsAiProcessing(true);
    setTimeout(() => {
      if (hasNextIteration) {
        setCurrentIteration(nextIteration);
      }
      setIsAiProcessing(false);
    }, 2500);
  };

  const handleAccept = () => {
    if (selectedReviewIssue) {
      setIssues(prev =>
        prev.map(item =>
          item.id === selectedReviewIssue.id ? { ...item, aiStatus: "Resolved" } : item
        )
      );
    }
    setIsReviewModalOpen(false);
  };

  const activeFix = selectedReviewIssue?.fixIterations[currentIteration] ?? null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-6 selection:bg-[#5ec0ca]/30">

      {/* HEADER */}
      <header className="flex justify-between items-center mb-8 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-[#6287a2] flex items-center gap-2">
            <TerminalSquare className="text-[#5ec0ca]" /> DEVRESOLVE Workspace
          </h1>
          <p className="text-sm text-slate-500 mt-1">AI-Powered Developer Issue Resolution Pipeline</p>
        </div>
        <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm">
          <div className="w-8 h-8 rounded-full bg-[#6287a2]/10 flex items-center justify-center border border-[#6287a2]/30 text-[#6287a2] font-bold text-xs shrink-0">
            DEV
          </div>
          <div className="text-sm">
            <p className="text-[#6287a2] font-semibold leading-none">John Developer</p>
            <p className="text-slate-500 text-xs mt-1">Engineering Lead</p>
          </div>
        </div>
      </header>

      {/* STATS CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Total Issues"
          value={issues.length}
          icon={<MessageSquareWarning className="w-5 h-5 text-[#6287a2]" />}
        />
        <StatCard
          title="High Urgency"
          value={issues.filter(i => i.urgency === 'HIGH').length}
          icon={<AlertTriangle className="w-5 h-5 text-[#ce8f5a]" />}
          border="border-[#ce8f5a]/40"
          bg="bg-[#ce8f5a]/5"
          valueColor="text-[#ce8f5a]"
        />
        <StatCard
          title="Pending AI Review"
          value={issues.filter(i => i.aiStatus === 'Pending Review').length}
          icon={<Cpu className="w-5 h-5 text-[#5ec0ca]" />}
          border="border-[#5ec0ca]/40"
          valueColor="text-[#5ec0ca]"
        />
        <StatCard
          title="Resolved Issues"
          value={issues.filter(i => i.aiStatus === 'Resolved').length}
          icon={<CheckCircle2 className="w-5 h-5 text-[#80c8bc]" />}
          border="border-[#80c8bc]/40"
          valueColor="text-[#80c8bc]"
        />
      </div>

      {/* MAIN TABLE */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex justify-between items-center">
          <h2 className="text-lg font-bold text-[#6287a2]">Client Issue Tracker</h2>
          <Badge variant="outline" className="border-slate-300 text-slate-500 bg-slate-50 text-xs">
            Urgency Sorted
          </Badge>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Issue ID / Client</th>
                <th className="px-6 py-4">Problem Description</th>
                <th className="px-6 py-4">Urgency</th>
                <th className="px-6 py-4">AI Status</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {issues.map((issue) => (
                <tr
                  key={issue.id}
                  className={`hover:bg-slate-50/80 transition-colors ${issue.urgency === 'HIGH' ? 'bg-[#ce8f5a]/[0.02]' : ''}`}
                >
                  <td className="px-6 py-4">
                    <div className="font-bold text-[#efd199] drop-shadow-sm">{issue.id}</div>
                    <div className="text-slate-500 text-xs mt-1 font-medium">{issue.client}</div>
                  </td>
                  <td className="px-6 py-4 max-w-xs">
                    <div className="text-slate-800 font-medium">{issue.title}</div>
                    <div className="text-[#6287a2] text-xs mt-1 font-mono flex items-center gap-1 opacity-80">
                      <FileText className="w-3 h-3 shrink-0" /> {issue.module}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <UrgencyBadge urgency={issue.urgency} />
                  </td>
                  <td className="px-6 py-4">
                    <AIStatusBadge status={issue.aiStatus} />
                  </td>
                  <td className="px-6 py-4 text-right">
                    {issue.aiStatus === 'Pending Review' ? (
                      <Button
                        onClick={() => handleReviewClick(issue)}
                        size="sm"
                        className="bg-[#5ec0ca] hover:bg-[#4baab4] text-white shadow-sm font-bold border-0"
                      >
                        Review Fix <GitMerge className="w-4 h-4 ml-2" />
                      </Button>
                    ) : (
                      <Button
                        onClick={() => handleDetailsClick(issue)}
                        variant="outline"
                        size="sm"
                        className="border-slate-200 text-[#6287a2] hover:text-[#456277] hover:bg-slate-100 font-medium"
                      >
                        Details
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========== MODAL 1: AI FIX REVIEW (POPOUT) ========== */}
      <Dialog open={isReviewModalOpen} onOpenChange={setIsReviewModalOpen}>
        <DialogContent className="sm:max-w-2xl w-[95vw] bg-white border-slate-200 shadow-2xl text-slate-800 rounded-2xl overflow-hidden p-0">

          {/* Header */}
          <DialogHeader className="p-6 border-b border-slate-100 bg-gradient-to-r from-[#6287a2]/5 to-[#5ec0ca]/5">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div>
                <DialogTitle className="text-lg font-bold flex items-center gap-2 text-[#6287a2] mb-1">
                  <Sparkles className="text-[#5ec0ca] w-5 h-5" />
                  Bob AI — Fix Report
                  <span className="text-[#efd199] font-mono ml-1">{selectedReviewIssue?.id}</span>
                </DialogTitle>
                <DialogDescription className="text-slate-500 text-sm">
                  {selectedReviewIssue?.title}
                </DialogDescription>
              </div>
              {activeFix && !isAiProcessing && (
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold shrink-0 border ${
                  activeFix.isSuccessful
                    ? 'bg-[#80c8bc]/15 text-[#2c7a6e] border-[#80c8bc]/40'
                    : 'bg-red-50 text-red-500 border-red-200'
                }`}>
                  {activeFix.isSuccessful
                    ? <><ThumbsUp className="w-3 h-3" /> Fix Generated</>
                    : <><XCircle className="w-3 h-3" /> Fix Incomplete</>
                  }
                </div>
              )}
            </div>
          </DialogHeader>

          {/* Body */}
          <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
            {isAiProcessing ? (
              /* === AI PROCESSING STATE === */
              <div className="h-48 flex flex-col items-center justify-center space-y-4 bg-slate-50 rounded-xl border border-slate-100">
                <Loader2 className="w-9 h-9 text-[#ce8f5a] animate-spin" />
                <p className="text-[#ce8f5a] font-semibold text-sm text-center px-6 animate-pulse">
                  Bob AI is re-analyzing the issue and regenerating a new fix approach...
                </p>
                <p className="text-slate-400 text-xs">Iteration #{currentIteration + 2} in progress</p>
              </div>
            ) : activeFix ? (
              /* === FIX REPORT STATE === */
              <div className="space-y-5">

                {/* Iteration indicator */}
                <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                  {Array.from({ length: selectedReviewIssue?.fixIterations.length ?? 1 }, (_, i) => (
                    <div
                      key={i}
                      className={`h-1.5 rounded-full transition-all ${
                        i === currentIteration
                          ? 'w-6 bg-[#5ec0ca]'
                          : i < currentIteration
                          ? 'w-3 bg-[#80c8bc]'
                          : 'w-3 bg-slate-200'
                      }`}
                    />
                  ))}
                  <span className="ml-1">Attempt {activeFix.attempt}</span>
                </div>

                {/* AI Explanation block */}
                <div className="bg-[#5ec0ca]/5 border border-[#5ec0ca]/20 p-5 rounded-xl flex items-start gap-4">
                  <div className="p-2 bg-white rounded-full shadow-sm shrink-0 border border-[#5ec0ca]/20 mt-0.5">
                    <Cpu className="w-4 h-4 text-[#5ec0ca]" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#449199] uppercase tracking-wide mb-2">
                      Bob AI Analysis — Iteration {activeFix.attempt}
                    </h4>
                    <p className="text-sm text-slate-700 leading-relaxed">{activeFix.explanation}</p>
                  </div>
                </div>

                {/* File + Changes */}
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  {/* File name row */}
                  <div className="flex items-center gap-2 px-5 py-3 bg-slate-50 border-b border-slate-100">
                    <FileText className="w-4 h-4 text-[#6287a2] shrink-0" />
                    <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Modified File</span>
                    <span className="ml-auto font-mono text-xs text-[#6287a2] bg-white px-2.5 py-1 rounded border border-slate-200">
                      {activeFix.fileName}
                    </span>
                  </div>

                  {/* Status row */}
                  <div className={`flex items-center gap-2 px-5 py-2.5 border-b border-slate-100 text-xs font-semibold ${
                    activeFix.isSuccessful ? 'bg-[#80c8bc]/8 text-[#2c7a6e]' : 'bg-red-50 text-red-500'
                  }`}>
                    {activeFix.isSuccessful
                      ? <><CheckCircle2 className="w-3.5 h-3.5" /> Fix applied successfully — ready for review</>
                      : <><XCircle className="w-3.5 h-3.5" /> Fix incomplete — additional iteration recommended</>
                    }
                  </div>

                  {/* Changed parts */}
                  <div className="p-5 space-y-3">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <CheckSquare className="w-3.5 h-3.5 text-[#80c8bc]" /> What was changed
                    </h4>
                    <ul className="space-y-3">
                      {activeFix.changedParts.map((part, idx) => (
                        <li key={idx} className="flex items-start gap-3 text-sm text-slate-600 leading-relaxed">
                          <span className="mt-1.5 w-2 h-2 rounded-full bg-[#80c8bc] shrink-0" />
                          <span>{part}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

              </div>
            ) : (
              /* === NO FIX AVAILABLE YET === */
              <div className="h-48 flex flex-col items-center justify-center space-y-3 bg-slate-50 rounded-xl border border-slate-100">
                <Loader2 className="w-8 h-8 text-[#5ec0ca] animate-spin" />
                <p className="text-slate-500 text-sm">Bob AI is still generating the fix...</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <DialogFooter className="flex-col sm:flex-row gap-2 p-5 border-t border-slate-100 bg-slate-50/60 rounded-b-2xl">
            <Button
              type="button"
              variant="outline"
              onClick={handleRejectAndLoop}
              disabled={isAiProcessing}
              className="bg-white text-[#ce8f5a] hover:bg-[#ce8f5a]/10 hover:text-[#b87643] border-[#ce8f5a]/40 font-semibold"
            >
              <RefreshCcw className="w-4 h-4 mr-2" />
              Reject & Re-generate
            </Button>
            <Button
              type="button"
              onClick={handleAccept}
              disabled={isAiProcessing}
              className="bg-[#80c8bc] hover:bg-[#68ad9f] text-white font-bold border-0 shadow-sm"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Accept Fix
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========== MODAL 2: ISSUE DETAILS & AI PIPELINE ========== */}
      <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
        <DialogContent className="sm:max-w-xl bg-white border-slate-200 shadow-2xl text-slate-800 rounded-2xl overflow-hidden p-0">

          <DialogHeader className="p-6 border-b border-slate-100 bg-gradient-to-r from-[#6287a2]/5 to-slate-50">
            <div className="flex items-start justify-between gap-3">
              <div>
                <DialogTitle className="text-lg font-bold flex items-center gap-2 text-[#6287a2] mb-1">
                  <Bug className="text-[#ce8f5a] w-5 h-5" /> Issue Overview
                </DialogTitle>
                <DialogDescription className="text-slate-700 font-semibold text-sm mt-1">
                  {selectedDetailsIssue?.title}
                </DialogDescription>
              </div>
              <UrgencyBadge urgency={selectedDetailsIssue?.urgency as Urgency} />
            </div>
          </DialogHeader>

          <div className="p-6 space-y-6">
            {/* Original report */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Original Report</h3>
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-sm text-slate-600 leading-relaxed">
                {selectedDetailsIssue?.fullDescription}
              </div>
              <div className="flex flex-wrap gap-4 pt-1">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Server className="w-3.5 h-3.5 text-[#6287a2]" /> {selectedDetailsIssue?.repo}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Clock className="w-3.5 h-3.5 text-[#6287a2]" /> Reported {selectedDetailsIssue?.reportedAt}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <FileText className="w-3.5 h-3.5 text-[#6287a2]" />
                  <span className="font-mono text-[#ce8f5a]">{selectedDetailsIssue?.module}</span>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100" />

            {/* AI Pipeline */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">AI Pipeline Status</h3>
              <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                <PipelineStep title="Issue Assigned to Bob AI" status="done" />
                <PipelineStep
                  title="Fetching Repository Context"
                  status={selectedDetailsIssue?.aiStatus === 'Idle' ? 'loading' : 'done'}
                />
                <PipelineStep
                  title="Generating Code Fix & Logic"
                  status={
                    selectedDetailsIssue?.aiStatus === 'Coding' ? 'loading' :
                    selectedDetailsIssue?.aiStatus === 'Idle' ? 'pending' : 'done'
                  }
                />
                {selectedDetailsIssue?.aiStatus === 'Resolved' && (
                  <PipelineStep
                    title="Fix Accepted & Merged to Branch"
                    status="done"
                    isLast
                  />
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="p-4 border-t border-slate-100 bg-slate-50/60">
            <Button
              type="button"
              onClick={() => setIsDetailsModalOpen(false)}
              variant="outline"
              className="text-slate-600 border-slate-200 hover:bg-slate-100"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

/* ========== HELPER COMPONENTS ========== */

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  border?: string;
  bg?: string;
  valueColor?: string;
}

function StatCard({
  title,
  value,
  icon,
  border = "border-slate-200",
  bg = "bg-white",
  valueColor = "text-[#6287a2]",
}: Readonly<StatCardProps>) {
  return (
    <div className={`${bg} border ${border} rounded-xl p-5 flex items-center justify-between shadow-sm`}>
      <div>
        <p className="text-slate-500 text-sm font-semibold">{title}</p>
        <p className={`text-3xl font-bold mt-1 ${valueColor}`}>{value}</p>
      </div>
      <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
        {icon}
      </div>
    </div>
  );
}

function UrgencyBadge({ urgency }: Readonly<{ urgency: Urgency }>) {
  switch (urgency) {
    case 'HIGH':
      return (
        <Badge className="bg-[#ce8f5a]/15 text-[#b56e36] hover:bg-[#ce8f5a]/25 border border-[#ce8f5a]/40 shadow-none font-semibold">
          Critical
        </Badge>
      );
    case 'MEDIUM':
      return (
        <Badge className="bg-[#efd199]/20 text-[#b38f45] hover:bg-[#efd199]/30 border border-[#efd199]/50 shadow-none font-semibold">
          High (P1)
        </Badge>
      );
    case 'LOW':
      return (
        <Badge className="bg-[#6287a2]/10 text-[#50728a] hover:bg-[#6287a2]/20 border border-[#6287a2]/30 shadow-none font-semibold">
          Normal
        </Badge>
      );
    default:
      return null;
  }
}

function AIStatusBadge({ status }: Readonly<{ status: AIStatus }>) {
  switch (status) {
    case 'Idle':
      return (
        <div className="flex items-center text-[#b38f45] text-sm font-medium">
          <span className="w-2 h-2 rounded-full bg-[#efd199] mr-2 shrink-0" /> Waiting
        </div>
      );
    case 'Coding':
      return (
        <div className="flex items-center text-[#ce8f5a] text-sm font-semibold">
          <Loader2 className="w-3 h-3 mr-2 animate-spin shrink-0" /> Generating Code
        </div>
      );
    case 'Pending Review':
      return (
        <div className="flex items-center text-[#5ec0ca] text-sm font-bold">
          <span className="w-2 h-2 rounded-full bg-[#5ec0ca] mr-2 animate-pulse shrink-0" /> Requires Review
        </div>
      );
    case 'Resolved':
      return (
        <div className="flex items-center text-[#68ad9f] text-sm font-bold">
          <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 shrink-0" /> Synced & Fixed
        </div>
      );
    default:
      return null;
  }
}

function PipelineStep({
  title,
  status,
  isLast = false,
}: {
  title: string;
  status: 'done' | 'loading' | 'pending';
  isLast?: boolean;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex flex-col items-center">
        <div
          className={`w-6 h-6 rounded-full flex items-center justify-center z-10 ${
            status === 'done'
              ? 'bg-[#80c8bc] text-white'
              : status === 'loading'
              ? 'bg-[#ce8f5a]/20 text-[#ce8f5a]'
              : 'bg-slate-100 text-slate-300'
          }`}
        >
          {status === 'done' && <CheckCircle2 className="w-4 h-4" />}
          {status === 'loading' && <Loader2 className="w-4 h-4 animate-spin" />}
          {status === 'pending' && <div className="w-2 h-2 rounded-full bg-slate-300" />}
        </div>
        {!isLast && (
          <div
            className={`w-0.5 h-8 mt-1 rounded-full ${
              status === 'done' ? 'bg-[#80c8bc]/50' : 'bg-slate-100'
            }`}
          />
        )}
      </div>
      <div className={`pt-0.5 text-sm font-semibold ${status === 'pending' ? 'text-slate-400' : 'text-slate-700'}`}>
        {title}
      </div>
    </div>
  );
}
