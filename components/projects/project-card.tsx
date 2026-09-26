"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Globe, GitBranch, User, ChevronRight, Zap, AlertOctagon, ArrowUpCircle, Minus } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// ─── Urgency config ───────────────────────────────────────────────────────────
const URGENCY_CONFIG: Record<
  string,
  { label: string; className: string; icon: React.ElementType }
> = {
  CRITICAL: { label: "Critical",  className: "bg-red-100 text-red-600 border-red-200",       icon: AlertOctagon  },
  HIGH:     { label: "High",      className: "bg-orange-100 text-orange-600 border-orange-200", icon: ArrowUpCircle },
  MEDIUM:   { label: "Medium",    className: "bg-yellow-100 text-yellow-700 border-yellow-200", icon: Minus         },
  LOW:      { label: "Low",       className: "bg-zinc-100 text-zinc-500 border-zinc-200",     icon: Minus         },
};

export function ProjectCard({ project }: { project: any }) {
  const router = useRouter();
  const urgency = URGENCY_CONFIG[project.urgency] ?? URGENCY_CONFIG.LOW;
  const UrgencyIcon = urgency.icon;

  return (
    <div className="bg-white border border-dev-slate/10 rounded-[24px] p-7 hover:border-dev-cyan/40 hover:shadow-xl hover:shadow-dev-cyan/5 transition-all duration-300 group flex flex-col relative overflow-hidden">

      {/* Glow Effect on Hover */}
      <div className="absolute -right-10 -top-10 w-32 h-32 bg-dev-cyan/5 rounded-full blur-3xl group-hover:bg-dev-cyan/10 transition-all" />

      {/* ── Card Header: badges + reporter ── */}
      <div className="flex justify-between items-start mb-5 relative z-10">
        <div className="flex gap-2 flex-wrap">
          <Badge className="bg-dev-slate/5 text-dev-slate border-dev-slate/10 text-[10px] font-bold">
            {project.id}
          </Badge>
          <Badge
            className={
              project.status === "ACTIVE"
                ? "bg-dev-mint/10 text-dev-mint border-dev-mint/20"
                : "bg-dev-sand/10 text-dev-sand border-dev-sand/20"
            }
          >
            {project.status}
          </Badge>
          {/* Urgency badge */}
          <span
            className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border ${urgency.className}`}
          >
            <UrgencyIcon size={11} />
            {urgency.label}
          </span>
        </div>

        {/* Reporter */}
        <div className="flex items-center gap-1.5 text-dev-slate/50 shrink-0">
          <User size={13} />
          <span className="text-[11px] font-bold uppercase tracking-tight">{project.reporter}</span>
        </div>
      </div>

      {/* ── Name & Description ── */}
      <h3 className="text-[22px] font-bold text-dev-slate mb-2 group-hover:text-dev-cyan transition-colors">
        {project.name}
      </h3>
      <p className="text-body-main text-dev-slate/60 line-clamp-2 mb-6">
        {project.description}
      </p>

      {/* ── Tech Stack ── */}
      <div className="flex flex-wrap gap-2 mb-8">
        {project.techStack.map((tech: string) => (
          <span
            key={tech}
            className="bg-[#f8fafc] text-dev-slate/70 text-[10px] px-3 py-1.5 rounded-lg border border-dev-slate/5 font-medium"
          >
            {tech}
          </span>
        ))}
      </div>

      {/* ── Repo Details ── */}
      <div className="bg-[#fcfcfd] rounded-2xl p-4 border border-dev-slate/5 mb-8 space-y-3">
        <div className="flex justify-between items-center text-[12px]">
          <div className="flex items-center gap-2 text-dev-slate/50 font-medium">
            <Globe size={14} /> Repository
          </div>
          <span className="text-dev-slate font-semibold truncate max-w-[180px]">
            {project.repository}
          </span>
        </div>
        <div className="flex justify-between items-center text-[12px]">
          <div className="flex items-center gap-2 text-dev-slate/50 font-medium">
            <GitBranch size={14} /> Default Branch
          </div>
          <span className="text-dev-cyan font-bold">{project.branch}</span>
        </div>
      </div>

      {/* ── Stats Summary ── */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="text-left">
          <p className="text-[10px] text-dev-slate/40 uppercase font-bold tracking-widest mb-1">Total</p>
          <p className="text-xl font-bold text-dev-slate">{project.stats.total}</p>
        </div>
        <div className="text-left border-x border-dev-slate/5 px-4">
          <p className="text-[10px] text-red-400 uppercase font-bold tracking-widest mb-1">Critical</p>
          <p className="text-xl font-bold text-red-500">{project.stats.critical}</p>
        </div>
        <div className="text-left">
          <p className="text-[10px] text-dev-mint uppercase font-bold tracking-widest mb-1">Resolved</p>
          <p className="text-xl font-bold text-dev-mint">{project.stats.resolved}</p>
        </div>
      </div>

      {/* ── CTA Button ── */}
      <button
        onClick={() =>
          router.push(`/issues/new?projectId=${project.id}&projectName=${encodeURIComponent(project.name)}`)
        }
        className="w-full py-4 bg-dev-cyan hover:bg-dev-cyan/90 text-white rounded-[16px] text-action flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-lg shadow-dev-cyan/20 group/btn"
      >
        <Zap size={16} className="group-hover/btn:fill-white" />
        Select &amp; Report Issue
        <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
      </button>
    </div>
  );
}
