"use client";

import React, { useState } from "react";
import { Search, FolderOpen } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useWorkspace, issueStatus } from "@/components/layout/use-workspace";
import { ProjectCard } from "@/components/projects/project-card";


export default function ProjectsPage() {
  const workspace = useWorkspace();
  const PROJECTS_DATA = workspace.projects.map(project => {
    const issues = workspace.issues.filter(issue => issue.ProjekId === project.id);
    return { ...project, status: "REGISTERED", description: "Project registered in Supabase", techStack: [] as string[],
      repository: project.repoUrl, branch: project.defaultBranch, reporter: "Team", urgency: "LOW",
      stats: { total: issues.length, critical: 0, resolved: issues.filter(issue => issueStatus(workspace.jobs.find(job => job.issue_id === issue.id), issue.Status) === "RESOLVED").length,
        inProgress: issues.filter(issue => issueStatus(workspace.jobs.find(job => job.issue_id === issue.id), issue.Status) === "IN_PROGRESS").length } };
  });
  const [searchQuery, setSearchQuery] = useState("");

  const q = searchQuery.trim().toLowerCase();

  const filtered = PROJECTS_DATA.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.id.toLowerCase().includes(q) ||
      p.techStack.some((t) => t.toLowerCase().includes(q))
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
          onKeyDown={(e) => {
            if (e.key === "Enter") setSearchQuery((v) => v.trim());
          }}
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
