"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ClipboardList,
  CheckCircle2,
  Clock,
  CircleDashed,
  Bot,
  Search,
  ChevronRight,
  FolderOpen,
  User,
  Calendar,
  Tag,
} from "lucide-react";
import { useWorkspace, issueStatus } from "@/components/layout/use-workspace";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";
import { useSession } from "@/components/layout/use-session";

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
  LOW:      { label: "Unclassified",      color: "text-slate-400",      bg: "bg-slate-50",      border: "border-slate-200"      },
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
          <Link href={`/issues/${encodeURIComponent(issue.id)}`} className="inline-block mt-2 text-xs font-semibold text-[#449199] hover:underline">
            View full details →
          </Link>
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
  const workspace = useWorkspace();
  const user = useSession();
  const [scope, setScope] = useState<"mine" | "all">("mine");
  // Signed-in reporters store their profile ID in reporter_id; "All" shows the whole team's reports.
  const visibleIssues = scope === "mine" && user ? workspace.issues.filter(issue => issue.ReporterId === user.id) : workspace.issues;
  const MY_ISSUES: Issue[] = visibleIssues.map(issue => ({
    id: issue.id, title: issue.title, projectId: issue.ProjekId,
    project: workspace.projects.find(project => project.id === issue.ProjekId)?.name || issue.ProjekId,
    reporter: issue.ReporterName || issue.ReporterId || "Team", urgency: (["critical", "high", "medium", "low"].includes(issue.severity || "") ? issue.severity!.toUpperCase() : "LOW") as IssueUrgency, reportedAt: formatDateTime(issue.created_at),
    status: issueStatus(workspace.jobs.find(job => job.issue_id === issue.id), issue.Status),
  }));
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
      {workspace.error && <p role="alert" className="text-red-600">{workspace.error}</p>}
      {workspace.loading && <p>Loading reports...</p>}

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#6287a2] flex items-center gap-2">
            <ClipboardList className="text-[#5ec0ca] w-6 h-6" />
            My Issues
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {scope === "mine" ? "Reports you submitted" : "All reports from your team"} · saved in Supabase
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div role="group" aria-label="Which reports" className="flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs font-semibold">
            {(["mine", "all"] as const).map(option => (
              <button key={option} type="button" aria-pressed={scope === option} onClick={() => { setScope(option); setSelected(null); }}
                className={`px-3 py-1 rounded-md transition-colors ${scope === option ? "bg-[#5ec0ca] text-white" : "text-slate-500 hover:text-slate-700"}`}>
                {option === "mine" ? "Mine" : "All team"}
              </button>
            ))}
          </div>
          <Badge
            variant="outline"
            className="border-[#5ec0ca]/40 text-[#449199] bg-[#5ec0ca]/5 text-xs font-semibold gap-1.5"
          >
            <User className="w-3.5 h-3.5" /> {user?.name ?? "…"}
          </Badge>
        </div>
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
              {scope === "mine" && MY_ISSUES.length === 0 ? (
                <>You have not reported any issues yet. <Link href="/projects" className="text-[#449199] font-semibold hover:underline">Report one →</Link></>
              ) : "No issues match your filter."}
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
        DevResolve · AI-Powered Issue Resolution Pipeline · IBM Bob 2.0 Hackathon
      </div>
    </div>
  );
}
