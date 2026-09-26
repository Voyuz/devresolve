"use client";

import React, { useState } from "react";
import {
  ClipboardList,
  CheckCircle2,
  Clock,
  AlertTriangle,
  CircleDashed,
  Bot,
  Search,
  ChevronRight,
  FolderOpen,
  User,
  Calendar,
  Tag,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

// ─── Types ────────────────────────────────────────────────────────────────────
type IssueStatus = "RESOLVED" | "IN_PROGRESS" | "OPEN" | "PENDING_REVIEW";
type IssueUrgency = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

interface Issue {
  id: string;
  title: string;
  project: string;
  projectId: string;
  reporter: string;
  urgency: IssueUrgency;
  status: IssueStatus;
  reportedAt: string;
  resolvedAt?: string;
  bobSummary?: string;
}

// ─── Mock data — reported by current user ────────────────────────────────────
const MY_ISSUES: Issue[] = [
  {
    id: "ISS-105",
    title: "Product with stock = 0 can still be purchased",
    project: "Mini Shop E-Commerce",
    projectId: "MSHOP",
    reporter: "Rangga Pratama",
    urgency: "CRITICAL",
    status: "RESOLVED",
    reportedAt: "2024-01-15",
    resolvedAt: "2024-01-15",
    bobSummary: "Root cause: missing stock validation in OrderService. Fix applied to checkout guard — stock check enforced before order creation.",
  },
  {
    id: "ISS-099",
    title: "Double balance deduction when customer clicks pay button twice",
    project: "FinPay Payment Gateway",
    projectId: "FPAY",
    reporter: "Rangga Pratama",
    urgency: "CRITICAL",
    status: "RESOLVED",
    reportedAt: "2024-01-13",
    resolvedAt: "2024-01-14",
    bobSummary: "Idempotency key missing on POST /payment endpoint. Added request deduplication middleware — duplicate requests now return 409.",
  },
  {
    id: "ISS-101",
    title: "Expired JWT session token does not auto-refresh on active page",
    project: "Mini Shop E-Commerce",
    projectId: "MSHOP",
    reporter: "Rangga Pratama",
    urgency: "HIGH",
    status: "IN_PROGRESS",
    reportedAt: "2024-01-14",
    bobSummary: "Bob AI is analysing token refresh flow in AuthMiddleware. Fix in progress.",
  },
  {
    id: "ISS-088",
    title: "Image upload fails silently on product create form",
    project: "Mini Shop E-Commerce",
    projectId: "MSHOP",
    reporter: "Rangga Pratama",
    urgency: "MEDIUM",
    status: "RESOLVED",
    reportedAt: "2024-01-10",
    resolvedAt: "2024-01-11",
    bobSummary: "S3 bucket CORS policy was rejecting multipart/form-data from staging domain. Updated bucket policy and added error feedback to UI.",
  },
  {
    id: "ISS-094",
    title: "Checkout total rounds incorrectly for items with fractional prices",
    project: "Mini Shop E-Commerce",
    projectId: "MSHOP",
    reporter: "Rangga Pratama",
    urgency: "HIGH",
    status: "PENDING_REVIEW",
    reportedAt: "2024-01-12",
    bobSummary: "Fix generated: replaced floating-point arithmetic with Decimal library. Awaiting developer review before merge.",
  },
  {
    id: "ISS-077",
    title: "Payment webhook does not retry on 5xx response from bank",
    project: "FinPay Payment Gateway",
    projectId: "FPAY",
    reporter: "Rangga Pratama",
    urgency: "HIGH",
    status: "RESOLVED",
    reportedAt: "2024-01-08",
    resolvedAt: "2024-01-09",
    bobSummary: "Exponential backoff retry logic added to WebhookDispatcher. Max 3 retries with jitter applied.",
  },
  {
    id: "ISS-112",
    title: "Search results return stale data after product update",
    project: "Mini Shop E-Commerce",
    projectId: "MSHOP",
    reporter: "Rangga Pratama",
    urgency: "MEDIUM",
    status: "OPEN",
    reportedAt: "2024-01-16",
  },
];

// ─── Config maps ──────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<IssueStatus, { label: string; color: string; bg: string; border: string; icon: React.ElementType }> = {
  RESOLVED:       { label: "Resolved",       color: "text-[#2c7a6e]", bg: "bg-[#80c8bc]/10", border: "border-[#80c8bc]/30", icon: CheckCircle2   },
  IN_PROGRESS:    { label: "In Progress",    color: "text-[#5ec0ca]", bg: "bg-[#5ec0ca]/10", border: "border-[#5ec0ca]/30", icon: Bot             },
  PENDING_REVIEW: { label: "Pending Review", color: "text-[#b87643]", bg: "bg-[#ce8f5a]/10", border: "border-[#ce8f5a]/30", icon: Clock           },
  OPEN:           { label: "Open",           color: "text-slate-500", bg: "bg-slate-100",     border: "border-slate-200",    icon: CircleDashed    },
};

const URGENCY_CONFIG: Record<IssueUrgency, { label: string; color: string; bg: string; border: string }> = {
  CRITICAL: { label: "Critical", color: "text-red-500",        bg: "bg-red-50",        border: "border-red-100"        },
  HIGH:     { label: "High",     color: "text-[#ce8f5a]",      bg: "bg-[#ce8f5a]/10",  border: "border-[#ce8f5a]/30"  },
  MEDIUM:   { label: "Medium",   color: "text-yellow-600",     bg: "bg-yellow-50",     border: "border-yellow-100"     },
  LOW:      { label: "Low",      color: "text-slate-400",      bg: "bg-slate-50",      border: "border-slate-200"      },
};

// ─── Filter tabs ──────────────────────────────────────────────────────────────
const FILTER_TABS: { key: IssueStatus | "ALL"; label: string }[] = [
  { key: "ALL",           label: "All"            },
  { key: "OPEN",          label: "Open"           },
  { key: "IN_PROGRESS",   label: "In Progress"    },
  { key: "PENDING_REVIEW",label: "Pending Review" },
  { key: "RESOLVED",      label: "Resolved"       },
];

// ─── Issue Row ────────────────────────────────────────────────────────────────
function IssueRow({ issue, onClick }: { issue: Issue; onClick: () => void }) {
  const status  = STATUS_CONFIG[issue.status];
  const urgency = URGENCY_CONFIG[issue.urgency];
  const StatusIcon = status.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left px-5 py-4 hover:bg-slate-50/70 transition-colors group"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Top row: id + urgency + status */}
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md">
              {issue.id}
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${urgency.color} ${urgency.bg} ${urgency.border}`}>
              {urgency.label}
            </span>
            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border ${status.color} ${status.bg} ${status.border}`}>
              <StatusIcon className="w-3 h-3" />
              {status.label}
            </span>
          </div>

          {/* Title */}
          <p className="text-sm font-semibold text-slate-700 group-hover:text-[#5ec0ca] transition-colors leading-snug">
            {issue.title}
          </p>

          {/* Meta row */}
          <div className="flex items-center gap-4 mt-1.5 flex-wrap">
            <span className="flex items-center gap-1 text-xs text-slate-400">
              <FolderOpen className="w-3 h-3" />
              {issue.project}
            </span>
            <span className="flex items-center gap-1 text-xs text-slate-400">
              <Calendar className="w-3 h-3" />
              Reported {issue.reportedAt}
            </span>
            {issue.resolvedAt && (
              <span className="flex items-center gap-1 text-xs text-[#2c7a6e]">
                <CheckCircle2 className="w-3 h-3" />
                Resolved {issue.resolvedAt}
              </span>
            )}
          </div>

          {/* Bob summary pill — only if available */}
          {issue.bobSummary && (
            <div className="flex items-start gap-1.5 mt-2">
              <Bot className="w-3 h-3 text-[#5ec0ca] shrink-0 mt-0.5" />
              <p className="text-xs text-slate-400 leading-relaxed line-clamp-1">{issue.bobSummary}</p>
            </div>
          )}
        </div>

        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#5ec0ca] shrink-0 mt-1 transition-colors" />
      </div>
    </button>
  );
}

// ─── Detail Drawer (inline panel) ────────────────────────────────────────────
function IssueDetail({ issue, onClose }: { issue: Issue; onClose: () => void }) {
  const status  = STATUS_CONFIG[issue.status];
  const urgency = URGENCY_CONFIG[issue.urgency];
  const StatusIcon = status.icon;

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md">
              {issue.id}
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${urgency.color} ${urgency.bg} ${urgency.border}`}>
              {urgency.label}
            </span>
            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border ${status.color} ${status.bg} ${status.border}`}>
              <StatusIcon className="w-3 h-3" />
              {status.label}
            </span>
          </div>
          <h3 className="text-base font-bold text-slate-700 leading-snug">{issue.title}</h3>
        </div>
        <button
          onClick={onClose}
          className="text-slate-300 hover:text-slate-500 text-lg leading-none font-bold shrink-0 transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Meta */}
      <div className="px-5 py-4 bg-slate-50/50 border-b border-slate-100 grid grid-cols-2 gap-3 text-xs">
        <div className="flex items-center gap-1.5 text-slate-500">
          <FolderOpen className="w-3.5 h-3.5 text-[#5ec0ca]" />
          <span className="font-medium">Project:</span>
          <span className="text-slate-700 font-semibold">{issue.project}</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-500">
          <User className="w-3.5 h-3.5 text-[#5ec0ca]" />
          <span className="font-medium">Reported by:</span>
          <span className="text-slate-700 font-semibold">{issue.reporter}</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-500">
          <Calendar className="w-3.5 h-3.5 text-[#5ec0ca]" />
          <span className="font-medium">Reported:</span>
          <span className="text-slate-700">{issue.reportedAt}</span>
        </div>
        {issue.resolvedAt && (
          <div className="flex items-center gap-1.5 text-slate-500">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#80c8bc]" />
            <span className="font-medium">Resolved:</span>
            <span className="text-[#2c7a6e] font-semibold">{issue.resolvedAt}</span>
          </div>
        )}
      </div>

      {/* Bob AI Summary */}
      {issue.bobSummary ? (
        <div className="px-5 py-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 bg-[#5ec0ca]/10 rounded-lg border border-[#5ec0ca]/20">
              <Bot className="w-3.5 h-3.5 text-[#5ec0ca]" />
            </div>
            <span className="text-xs font-bold text-[#449199] uppercase tracking-widest">
              IBM Bob AI — Resolution Summary
            </span>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed bg-[#5ec0ca]/5 border border-[#5ec0ca]/15 rounded-lg px-4 py-3">
            {issue.bobSummary}
          </p>
        </div>
      ) : (
        <div className="px-5 py-4">
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <CircleDashed className="w-4 h-4" />
            This issue has not been picked up by Bob AI yet.
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function IssuesPage() {
  const [filter,   setFilter]   = useState<IssueStatus | "ALL">("ALL");
  const [search,   setSearch]   = useState("");
  const [selected, setSelected] = useState<Issue | null>(null);

  const filtered = MY_ISSUES.filter((i) => {
    const matchStatus = filter === "ALL" || i.status === filter;
    const matchSearch = [i.title, i.id, i.project].some((f) =>
      f.toLowerCase().includes(search.toLowerCase())
    );
    return matchStatus && matchSearch;
  });

  // ── Summary counts ──
  const counts = {
    total:         MY_ISSUES.length,
    resolved:      MY_ISSUES.filter((i) => i.status === "RESOLVED").length,
    inProgress:    MY_ISSUES.filter((i) => i.status === "IN_PROGRESS").length,
    pendingReview: MY_ISSUES.filter((i) => i.status === "PENDING_REVIEW").length,
    open:          MY_ISSUES.filter((i) => i.status === "OPEN").length,
  };

  const summaryStats = [
    { label: "Total Reported",   value: counts.total,         color: "text-[#6287a2]", border: "border-[#6287a2]/30", bg: "bg-[#6287a2]/5",  icon: Tag         },
    { label: "Resolved",         value: counts.resolved,      color: "text-[#80c8bc]", border: "border-[#80c8bc]/30", bg: "bg-[#80c8bc]/5",  icon: CheckCircle2 },
    { label: "In Progress",      value: counts.inProgress,    color: "text-[#5ec0ca]", border: "border-[#5ec0ca]/30", bg: "bg-[#5ec0ca]/5",  icon: Bot          },
    { label: "Awaiting Review",  value: counts.pendingReview, color: "text-[#b87643]", border: "border-[#ce8f5a]/30", bg: "bg-[#ce8f5a]/5",  icon: Clock        },
  ];

  return (
    <div className="space-y-8">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#6287a2] flex items-center gap-2">
            <ClipboardList className="text-[#5ec0ca] w-6 h-6" />
            My Issues
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Track the status of all bug reports you have submitted
          </p>
        </div>
        <Badge
          variant="outline"
          className="border-[#5ec0ca]/40 text-[#449199] bg-[#5ec0ca]/5 text-xs font-semibold gap-1.5"
        >
          <User className="w-3.5 h-3.5" /> Rangga Pratama
        </Badge>
      </div>

      {/* ── Summary KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryStats.map((s) => (
          <div
            key={s.label}
            className={`border ${s.border} ${s.bg} rounded-xl p-5 flex items-center justify-between`}
          >
            <div>
              <p className="text-slate-500 text-sm font-medium">{s.label}</p>
              <p className={`text-3xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            </div>
            <div className="p-3 bg-white/60 rounded-lg border border-white/80">
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
          </div>
        ))}
      </div>

      {/* ── Issue List + Detail ── */}
      <div className={`grid gap-6 ${selected ? "grid-cols-1 lg:grid-cols-5" : "grid-cols-1"}`}>

        {/* Issue List */}
        <div className={`bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden ${selected ? "lg:col-span-3" : ""}`}>

          {/* Search + Filter bar */}
          <div className="px-5 py-4 border-b border-slate-100 space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
              <input
                type="text"
                placeholder="Search by title, ID, or project…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none focus:border-[#5ec0ca] focus:ring-2 focus:ring-[#5ec0ca]/20 transition-all"
              />
            </div>

            {/* Filter tabs */}
            <div className="flex gap-1.5 flex-wrap">
              {FILTER_TABS.map((tab) => {
                const count = tab.key === "ALL"
                  ? MY_ISSUES.length
                  : MY_ISSUES.filter((i) => i.status === tab.key).length;
                const isActive = filter === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => { setFilter(tab.key); setSelected(null); }}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                      isActive
                        ? "bg-[#5ec0ca] text-white shadow-sm"
                        : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    }`}
                  >
                    {tab.label}
                    <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                      isActive ? "bg-white/20 text-white" : "bg-white text-slate-400"
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Issue rows */}
          {filtered.length === 0 ? (
            <div className="py-16 text-center text-sm text-slate-300">
              No issues match your filter.
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {filtered.map((issue) => (
                <IssueRow
                  key={issue.id}
                  issue={issue}
                  onClick={() => setSelected(selected?.id === issue.id ? null : issue)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="lg:col-span-2">
            <IssueDetail issue={selected} onClose={() => setSelected(null)} />
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="pt-4 border-t border-slate-100 flex items-center gap-2 text-[10px] text-slate-300 font-medium uppercase tracking-widest">
        <ClipboardList className="w-3 h-3 text-[#5ec0ca]" />
        DevResolve · AI-Powered Issue Resolution Pipeline · Hackathon Edition 2024
      </div>
    </div>
  );
}
