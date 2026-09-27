import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getRepoInfo } from "@/lib/github/repo-info";
import type { Scope } from "@/lib/auth/scope";
import type { Session } from "@/lib/auth/session";
import type { BobProject } from "@/types/bob";
import type { validateNewProject } from "@/lib/project-input";

/** Developers see all projects; reporters see projects whose profil_id is their profile ID. */
export async function viewerScope(session: Session | null): Promise<Scope> {
  if (session?.role === "developer") return { all: true };
  if (!session) return { all: false, projectIds: new Set() };
  const { data, error } = await createSupabaseServerClient().from("projects").select("id::text").eq("profil_id", session.id);
  if (error) throw new Error("Cannot load your projects. Check that projects.profil_id exists.");
  return { all: false, projectIds: new Set(((data ?? []) as unknown as { id: string }[]).map(row => row.id)) };
}

const REPO_PROBLEM: Record<string, string> = {
  NOT_FOUND: "GitHub repository not found. It must be public (or reachable with the server's GitHub token).",
  ARCHIVED: "This GitHub repository is archived; Bob cannot publish fixes to it.",
  UNAVAILABLE: "Cannot reach GitHub right now. Try again in a minute.",
  INVALID_URL: "Use a plain GitHub HTTPS URL such as https://github.com/owner/repo.",
};

/** Registers a project owned by the given profile after checking the repository and branch on GitHub. */
export async function createProject(ownerId: string, input: ReturnType<typeof validateNewProject>): Promise<BobProject> {
  const repo = await getRepoInfo(input.repoUrl, input.defaultBranch);
  if (repo.status === "BRANCH_MISSING") throw new Error(`Branch "${input.defaultBranch}" does not exist in that repository.`);
  if (repo.status !== "CONNECTED") throw new Error(REPO_PROBLEM[repo.status] ?? "The repository cannot be used.");
  const { data, error } = await createSupabaseServerClient().from("projects")
    .insert({ NameProjek: input.name, RepoUrl: input.repoUrl, DefaultBranch: input.defaultBranch, profil_id: ownerId })
    .select('id::text,"NameProjek","RepoUrl","DefaultBranch"').single();
  if (error || !data) throw new Error("Cannot save the project.");
  const row = data as unknown as { id: string; NameProjek: string; RepoUrl: string; DefaultBranch: string };
  return { id: row.id, name: row.NameProjek, repoUrl: row.RepoUrl, defaultBranch: row.DefaultBranch };
}
