"use client";

import React, { useState } from "react";
import { Search, FolderOpen } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ProjectCard } from "@/components/projects/project-card";

const PROJECTS_DATA = [
  {
    id: "MSHOP",
    name: "Mini Shop E-Commerce",
    status: "ACTIVE",
    description:
      "E-commerce microservices with cart, checkout, product catalog, and real-time inventory management.",
    techStack: ["Node.js", "Express", "TypeScript", "PostgreSQL"],
    repository: "devresolve-team/minishop-api",
    branch: "main",
    reporter: "Carlooo",
    stats: { total: 8, critical: 1, resolved: 5, inProgress: 2 },
    urgency: "HIGH",
  },
  {
    id: "FPAY",
    name: "FinPay Payment Gateway",
    status: "SYNCING",
    description:
      "Core payment processing engine handling QRIS, virtual accounts, and webhook reconciliations.",
    techStack: ["Go", "Redis", "PostgreSQL", "Docker"],
    repository: "devresolve-team/finpay-core",
    branch: "staging",
    reporter: "Yuwan Deni",
    stats: { total: 4, critical: 2, resolved: 1, inProgress: 1 },
    urgency: "CRITICAL",
  },
];

export default function ProjectsPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = PROJECTS_DATA.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.techStack.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="max-w-6xl mx-auto py-4">

      {/* ── Header ── */}
      <div className="mb-10 flex justify-between items-end">
        <div>
          <div className="flex items-center gap-2 text-dev-cyan mb-2">
            <FolderOpen size={16} />
            <span className="text-[11px] font-bold uppercase tracking-widest">
              Reporter Mode / Projects
            </span>
          </div>
          <h1 className="text-[32px] font-bold text-dev-slate leading-tight">
            Select Target Repository
          </h1>
          <p className="text-sm text-zinc-400 mt-1 max-w-2xl">
            Choose a project to open a new bug report. Issues will be automatically
            mapped to the repository for IBM Bob 2.0 analysis.
          </p>
        </div>

        <div className="bg-dev-slate/5 border border-dev-slate/10 p-4 rounded-2xl text-center min-w-[160px]">
          <p className="text-[10px] font-bold text-dev-slate uppercase tracking-widest mb-1">
            Registered
          </p>
          <p className="text-2xl font-extrabold text-dev-slate">
            {PROJECTS_DATA.length} Projects
          </p>
        </div>
      </div>

      {/* ── Search ── */}
      <div className="relative mb-10 w-full">
        <Search
          className="absolute left-4 top-1/2 -translate-y-1/2 text-dev-slate/40"
          size={16}
        />
        <Input
          placeholder="Search by project name, ID, or tech stack…"
          className="w-full bg-white border-zinc-200 pl-10 h-10 rounded-xl text-body-main focus:ring-dev-cyan shadow-sm text-dev-slate placeholder:text-zinc-300"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* ── Project Cards ── */}
      {filtered.length === 0 ? (
        <div className="text-center py-24 text-zinc-300 font-medium">
          No projects found for &quot;{searchQuery}&quot;
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {filtered.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}
