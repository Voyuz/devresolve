"use client";

import React, { useEffect, useState } from "react";
import { Search, FolderOpen } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useWorkspace } from "@/components/layout/use-workspace";
import { projectMetrics } from "@/components/layout/workspace-metrics";
import { formatDateTime } from "@/lib/utils";
import type { RepoInfo } from "@/lib/github/repo-info";
import { ProjectCard } from "@/components/projects/project-card";
import { AddProjectDialog } from "@/components/projects/add-project-dialog";
import { useSession } from "@/components/layout/use-session";


export default function ProjectsPage() {
  const workspace = useWorkspace();
  const user = useSession();
  const isDeveloper = user?.role === "developer";
  const [reposVersion, setReposVersion] = useState(0);
  // Live repository metadata (description, languages, branch check) from GitHub via the server.
  const [repos, setRepos] = useState<Record<string, RepoInfo> | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/projects/github", { cache: "no-store", signal: controller.signal })
      .then(response => response.ok ? response.json() : { repos: {} })
      .then(body => setRepos(body.repos ?? {}))
      .catch(() => { if (!controller.signal.aborted) setRepos({}); });
    return () => controller.abort();
  }, [reposVersion]);
  const refresh = () => { workspace.reload(); setReposVersion(value => value + 1); };

  const PROJECTS_DATA = workspace.projects.map(project => {
    const metrics = projectMetrics(project.id, workspace.issues, workspace.jobs);
    const repo = repos?.[project.id];
    const description = repo?.description
      || (repo?.status === "INVALID_URL" ? "Repository URL is not a valid GitHub HTTPS URL. Update RepoUrl in Supabase."
      : repo?.status === "NOT_FOUND" ? "Repository not found on GitHub (private or deleted)."
      : repo?.status === "BRANCH_MISSING" ? `Branch "${project.defaultBranch}" does not exist on GitHub yet.`
      : repo ? "No description on GitHub." : "Loading repository details...");
    return { ...project, status: repos ? repo?.status ?? "UNAVAILABLE" : "CHECKING", description, techStack: repo?.languages ?? [],
      repository: project.repoUrl, branch: project.defaultBranch,
      lastActivity: metrics.lastReportedAt ? `Last report ${formatDateTime(metrics.lastReportedAt)}` : "No reports yet",
      urgency: metrics.urgency,
      stats: { total: metrics.total, critical: metrics.critical, resolved: metrics.resolved, inProgress: metrics.inProgress } };
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
              {isDeveloper ? "All projects" : "Your projects"}
            </span>
          </div>
          <h1 className="text-[32px] font-bold text-dev-slate leading-tight">
            Select Target Repository
          </h1>
          <p className="text-sm text-zinc-400 mt-1 max-w-2xl">
            Choose a project to open a new bug report. Issues will be automatically
            mapped to the repository for IBM Bob 2.0 analysis.
            {!isDeveloper && " You see the projects you registered."}
          </p>
        </div>

        <div className="flex items-end gap-4">
        <AddProjectDialog onCreated={refresh} />
        <div className="bg-dev-slate/5 border border-dev-slate/10 p-4 rounded-2xl text-center min-w-[160px]">
          <p className="text-[10px] font-bold text-dev-slate uppercase tracking-widest mb-1">
            Registered
          </p>
          <p className="text-2xl font-extrabold text-dev-slate">
            {PROJECTS_DATA.length} Projects
          </p>
        </div>
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
      {!workspace.loading && PROJECTS_DATA.length === 0 ? (
        <div className="text-center py-20 space-y-4 border border-dashed border-zinc-200 rounded-2xl">
          <FolderOpen className="w-10 h-10 mx-auto text-zinc-300" />
          <p className="text-dev-slate font-semibold">You have no projects yet</p>
          <p className="text-sm text-zinc-400 max-w-md mx-auto">Add the GitHub repository of the application you want to report bugs for.</p>
          <div className="flex justify-center"><AddProjectDialog onCreated={refresh} label="Add your first project" /></div>
        </div>
      ) : filtered.length === 0 ? (
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
