"use client";

import React, { useState } from "react";
import {
  Cpu,
  GitMerge,
  CheckCircle2,
  Loader2,
  RefreshCcw,
  FileText,
  CheckSquare,
  ThumbsUp,
  XCircle,
  Sparkles,
  Clock,
  Server,
} from "lucide-react";
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
type BobStatus = "Analyzing" | "Coding" | "Pending Review" | "Resolved";

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

// --- MOCK DATA ---
const initialTasks: BobTask[] = [
  {
    id: "ISS-092",
    client: "FinTech Indo Ltd.",
    title: "Memory leak on payment gateway processing",
    urgency: "HIGH",
    bobStatus: "Pending Review",
    module: "payment-engine.ts",
    repo: "devresolve/finpay-api",
    assignedAt: "2 hours ago",
    fixIterations: [
      {
        attempt: 1,
        explanation:
          "Analysis complete. The root cause is a database connection that is never returned to the pool after a transaction completes. I identified the pattern in the async callback chain and applied targeted fixes.",
        fileName: "payment-engine.ts",
        changedParts: [
          "Converted the main 'processPayload' function from callback-based to async/await to ensure sequential and predictable execution.",
          "Added an explicit 'req.conn.release()' call at the end of the successful transaction path.",
          "Wrapped the release logic inside a 'finally' block so the connection is force-released even when the system catches an error.",
        ],
        isSuccessful: true,
      },
      {
        attempt: 2,
        explanation:
          "Understood. The previous fix only handled one connection path. I have now audited all entry points and applied a more comprehensive connection lifecycle guard.",
        fileName: "payment-engine.ts",
        changedParts: [
          "Added a connection pool middleware wrapper that automatically tracks and releases any connection opened within the request lifecycle.",
          "Removed three redundant manual connection opens found in the retry handler.",
          "Added a timeout guard — any connection idle for more than 30 seconds is now automatically released.",
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
    bobStatus: "Pending Review",
    module: "cart-service.js",
    repo: "devresolve/minishop-ecommerce",
    assignedAt: "4 hours ago",
    fixIterations: [
      {
        attempt: 1,
        explanation:
          "Logic bug confirmed. The system is currently deducting stock even when quantity is already zero, resulting in negative stock values.",
        fileName: "cart-service.js",
        changedParts: [
          "Added an 'if (item.stock <= 0)' guard at the beginning of the 'updateCart' function before any database write occurs.",
          "Prevented the save operation from executing if stock is insufficient and returned a descriptive 'Item out of stock' error to the client.",
          "Corrected the stock deduction formula to use the exact requested quantity instead of a rounded approximation.",
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
    bobStatus: "Coding",
    module: "route-api.go",
    repo: "devresolve/fleet-track",
    assignedAt: "1 hour ago",
    fixIterations: [],
  },
  {
    id: "ISS-102",
    client: "Internal QA",
    title: "UI misalignment on mobile dashboard",
    urgency: "MEDIUM",
    bobStatus: "Analyzing",
    module: "Dashboard.tsx",
    repo: "devresolve/frontend-web",
    assignedAt: "Yesterday",
    fixIterations: [],
  },
  {
    id: "ISS-105",
    client: "Startup X",
    title: "Export to CSV format incorrect",
    urgency: "LOW",
    bobStatus: "Resolved",
    module: "export-utils.py",
    repo: "devresolve/reporting-service",
    assignedAt: "2 days ago",
    fixIterations: [
      {
        attempt: 1,
        explanation:
          "Date formatting mismatch identified. The export utility was using Python's default locale-based date serializer instead of the ISO-8601 standard formatter.",
        fileName: "export-utils.py",
        changedParts: [
          "Replaced 'strftime(\"%m/%d/%Y\")' with 'date.isoformat()' across all three export functions.",
          "Added a unit test case to assert the output format matches YYYY-MM-DD before the CSV is written to disk.",
        ],
        isSuccessful: true,
      },
    ],
  },
];

const URGENCY_ORDER: Record<Urgency, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };

function UrgencyBadge({ urgency }: { urgency: Urgency }) {
  if (urgency === "HIGH")
    return <Badge className="bg-[#ce8f5a]/15 text-[#b56e36] border border-[#ce8f5a]/40 shadow-none font-semibold text-xs">Critical</Badge>;
  if (urgency === "MEDIUM")
    return <Badge className="bg-[#efd199]/20 text-[#b38f45] border border-[#efd199]/50 shadow-none font-semibold text-xs">High (P1)</Badge>;
  return <Badge className="bg-[#6287a2]/10 text-[#50728a] border border-[#6287a2]/30 shadow-none font-semibold text-xs">Normal</Badge>;
}

function BobStatusBadge({ status }: { status: BobStatus }) {
  if (status === "Analyzing")
    return <div className="flex items-center gap-1.5 text-xs font-semibold text-[#b38f45]"><Loader2 className="w-3 h-3 animate-spin" />Analyzing</div>;
  if (status === "Coding")
    return <div className="flex items-center gap-1.5 text-xs font-semibold text-[#ce8f5a]"><Loader2 className="w-3 h-3 animate-spin" />Generating Code</div>;
  if (status === "Pending Review")
    return <div className="flex items-center gap-1.5 text-xs font-bold text-[#5ec0ca]"><span className="w-2 h-2 rounded-full bg-[#5ec0ca] animate-pulse" />Pending Review</div>;
  return <div className="flex items-center gap-1.5 text-xs font-bold text-[#68ad9f]"><CheckCircle2 className="w-3.5 h-3.5" />Resolved</div>;
}

export default function BobResolutionPage() {
  const [tasks, setTasks] = useState<BobTask[]>(
    [...initialTasks].sort((a, b) => URGENCY_ORDER[a.urgency] - URGENCY_ORDER[b.urgency])
  );

  // Review modal state
  const [selectedTask, setSelectedTask] = useState<BobTask | null>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [currentIteration, setCurrentIteration] = useState(0);
  const [isAiProcessing, setIsAiProcessing] = useState(false);

  const openReview = (task: BobTask) => {
    setSelectedTask(task);
    setCurrentIteration(0);
    setIsAiProcessing(false);
    setIsReviewOpen(true);
  };

  const handleReject = () => {
    if (!selectedTask) return;
    const next = currentIteration + 1;
    const hasNext = next < selectedTask.fixIterations.length;
    setIsAiProcessing(true);
    setTimeout(() => {
      if (hasNext) setCurrentIteration(next);
      setIsAiProcessing(false);
    }, 2500);
  };

  const handleAccept = () => {
    if (!selectedTask) return;
    setTasks((prev) =>
      prev.map((t) => (t.id === selectedTask.id ? { ...t, bobStatus: "Resolved" } : t))
    );
    setIsReviewOpen(false);
  };

  const activeFix = selectedTask?.fixIterations[currentIteration] ?? null;

  const queue = tasks.filter((t) => t.bobStatus !== "Resolved");
  const resolved = tasks.filter((t) => t.bobStatus === "Resolved");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#6287a2] flex items-center gap-2">
            <Cpu className="text-[#5ec0ca] w-6 h-6" />
            Bob AI Resolution Queue
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Tasks currently being handled by Bob AI — review and accept or reject generated fixes
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-[#5ec0ca]/10 text-[#449199] border border-[#5ec0ca]/30 font-semibold text-xs gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#5ec0ca] animate-pulse" />
            {queue.length} Active
          </Badge>
          <Badge className="bg-[#80c8bc]/10 text-[#2c7a6e] border border-[#80c8bc]/30 font-semibold text-xs gap-1.5">
            <CheckCircle2 className="w-3 h-3" />
            {resolved.length} Resolved
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
                    {task.bobStatus === "Pending Review" ? (
                      <Button
                        size="sm"
                        onClick={() => openReview(task)}
                        className="bg-[#5ec0ca] hover:bg-[#4baab4] text-white font-bold border-0 gap-1.5"
                      >
                        <GitMerge className="w-3.5 h-3.5" /> Review Fix
                      </Button>
                    ) : (
                      <span className="text-xs text-slate-400 italic">In progress…</span>
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
            <h2 className="text-sm font-bold text-slate-400">Resolved Tasks</h2>
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
                      <div className="font-mono text-xs font-bold">{task.id}</div>
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
      <Dialog open={isReviewOpen} onOpenChange={setIsReviewOpen}>
        <DialogContent className="sm:max-w-2xl w-[95vw] bg-white border-slate-200 shadow-2xl text-slate-800 rounded-2xl overflow-hidden p-0">
          {/* Header */}
          <DialogHeader className="p-6 border-b border-slate-100 bg-gradient-to-r from-[#6287a2]/5 to-[#5ec0ca]/5">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div>
                <DialogTitle className="text-base font-bold flex items-center gap-2 text-[#6287a2] mb-1">
                  <Sparkles className="text-[#5ec0ca] w-4 h-4" />
                  Bob AI — Fix Report
                  <span className="text-[#efd199] font-mono">{selectedTask?.id}</span>
                </DialogTitle>
                <DialogDescription className="text-slate-500 text-sm">
                  {selectedTask?.title}
                </DialogDescription>
              </div>
              {activeFix && !isAiProcessing && (
                <div
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold shrink-0 border ${
                    activeFix.isSuccessful
                      ? "bg-[#80c8bc]/15 text-[#2c7a6e] border-[#80c8bc]/40"
                      : "bg-red-50 text-red-500 border-red-200"
                  }`}
                >
                  {activeFix.isSuccessful ? (
                    <><ThumbsUp className="w-3 h-3" /> Fix Generated</>
                  ) : (
                    <><XCircle className="w-3 h-3" /> Fix Incomplete</>
                  )}
                </div>
              )}
            </div>
          </DialogHeader>

          {/* Body */}
          <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
            {isAiProcessing ? (
              <div className="h-48 flex flex-col items-center justify-center space-y-4 bg-slate-50 rounded-xl border border-slate-100">
                <Loader2 className="w-9 h-9 text-[#ce8f5a] animate-spin" />
                <p className="text-[#ce8f5a] font-semibold text-sm text-center px-6 animate-pulse">
                  Bob AI is re-analyzing and regenerating a new fix approach...
                </p>
                <p className="text-slate-400 text-xs">Iteration #{currentIteration + 2} in progress</p>
              </div>
            ) : activeFix ? (
              <div className="space-y-5">
                {/* Iteration progress dots */}
                <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                  {Array.from({ length: selectedTask?.fixIterations.length ?? 1 }, (_, i) => (
                    <div
                      key={i}
                      className={`h-1.5 rounded-full transition-all ${
                        i === currentIteration
                          ? "w-6 bg-[#5ec0ca]"
                          : i < currentIteration
                          ? "w-3 bg-[#80c8bc]"
                          : "w-3 bg-slate-200"
                      }`}
                    />
                  ))}
                  <span className="ml-1">Attempt {activeFix.attempt}</span>
                </div>

                {/* AI explanation */}
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

                {/* File + changes */}
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="flex items-center gap-2 px-5 py-3 bg-slate-50 border-b border-slate-100">
                    <FileText className="w-4 h-4 text-[#6287a2] shrink-0" />
                    <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Modified File</span>
                    <span className="ml-auto font-mono text-xs text-[#6287a2] bg-white px-2.5 py-1 rounded border border-slate-200">
                      {activeFix.fileName}
                    </span>
                  </div>

                  <div
                    className={`flex items-center gap-2 px-5 py-2.5 border-b border-slate-100 text-xs font-semibold ${
                      activeFix.isSuccessful ? "bg-[#80c8bc]/8 text-[#2c7a6e]" : "bg-red-50 text-red-500"
                    }`}
                  >
                    {activeFix.isSuccessful ? (
                      <><CheckCircle2 className="w-3.5 h-3.5" /> Fix applied successfully — ready for review</>
                    ) : (
                      <><XCircle className="w-3.5 h-3.5" /> Fix incomplete — additional iteration recommended</>
                    )}
                  </div>

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
              <div className="h-48 flex flex-col items-center justify-center space-y-3 bg-slate-50 rounded-xl border border-slate-100">
                <Loader2 className="w-8 h-8 text-[#5ec0ca] animate-spin" />
                <p className="text-slate-500 text-sm">Bob AI is still generating the fix...</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <DialogFooter className="flex-col sm:flex-row gap-2 p-5 border-t border-slate-100 bg-slate-50/60 rounded-b-2xl">
            <Button
              variant="outline"
              onClick={handleReject}
              disabled={isAiProcessing}
              className="bg-white text-[#ce8f5a] hover:bg-[#ce8f5a]/10 border-[#ce8f5a]/40 font-semibold gap-1.5"
            >
              <RefreshCcw className="w-4 h-4" /> Reject & Re-generate
            </Button>
            <Button
              onClick={handleAccept}
              disabled={isAiProcessing}
              className="bg-[#80c8bc] hover:bg-[#68ad9f] text-white font-bold border-0 shadow-sm gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" /> Accept Fix
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
