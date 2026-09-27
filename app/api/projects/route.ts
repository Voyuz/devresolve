import { listProjects } from "@/lib/supabase/bob-store";
import { createProject, viewerScope } from "@/lib/supabase/projects";
import { validateNewProject } from "@/lib/project-input";
import { canSeeProject } from "@/lib/auth/scope";
import { requireRole, sessionFromRequest } from "@/lib/auth/session";
import { listProfiles } from "@/lib/auth/profiles";

export const dynamic = "force-dynamic";

// GET /api/projects — projects visible to the signed-in profile (developers: all; reporters: their own).
export async function GET(request: Request) {
  try {
    const [projects, scope] = await Promise.all([listProjects(), viewerScope(sessionFromRequest(request))]);
    return Response.json({ projects: projects.filter(project => canSeeProject(scope, project.id)) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Cannot load projects." }, { status: 503 });
  }
}

// POST /api/projects — developers only: { name, repoUrl, defaultBranch?, ownerId } registers a project owned by
// the chosen reporter ("user" profile). The reporter then sees it on their Projects page.
export async function POST(request: Request) {
  const denied = requireRole(request, "developer");
  if (denied) return denied;
  let input;
  try { input = validateNewProject(await request.json()); }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Invalid project." }, { status: 400 }); }
  try {
    const owner = (await listProfiles()).find(profile => profile.id === input.ownerId);
    if (!owner || owner.role !== "user") return Response.json({ error: "Choose an existing user as the project owner." }, { status: 400 });
    return Response.json({ project: await createProject(owner.id, input) }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Cannot save the project." }, { status: 422 });
  }
}
