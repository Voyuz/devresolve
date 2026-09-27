import { listProjects } from "@/lib/supabase/bob-store";
import { getRepoInfo } from "@/lib/github/repo-info";
import { viewerScope } from "@/lib/supabase/projects";
import { canSeeProject } from "@/lib/auth/scope";
import { sessionFromRequest } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

// GET /api/projects/github — live GitHub metadata for each registered project, keyed by project ID.
export async function GET(request: Request) {
  try {
    const [all, scope] = await Promise.all([listProjects(), viewerScope(sessionFromRequest(request))]);
    const projects = all.filter(project => canSeeProject(scope, project.id));
    const entries = await Promise.all(projects.map(async project => [project.id, await getRepoInfo(project.repoUrl, project.defaultBranch)] as const));
    return Response.json({ repos: Object.fromEntries(entries) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Cannot load repository details." }, { status: 503 });
  }
}
