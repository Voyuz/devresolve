import { validateSubmission } from "@/lib/bob/request";
import { getProject, listProjects } from "@/lib/supabase/bob-store";
import { listIssues, saveIssue, saveTriage } from "@/lib/supabase/issues";
import { profileNames } from "@/lib/auth/profiles";
import { triageWithRules } from "@/lib/triage/rules";
import type { IssueListItem } from "@/types/issues";
import { requireRole, sessionFromRequest } from "@/lib/auth/session";
import { viewerScope } from "@/lib/supabase/projects";
import { canSeeProject } from "@/lib/auth/scope";

export const dynamic = "force-dynamic";

// GET /api/issues[?projectId=<id>] — issues newest first, each with its project name.
export async function GET(request: Request) {
  try {
    const projectId = new URL(request.url).searchParams.get("projectId");
    const [issues, projects, reporters, scope] = await Promise.all([listIssues(), listProjects(), profileNames(), viewerScope(sessionFromRequest(request))]);
    const names = new Map(projects.map(project => [project.id, project.name]));
    const items = (issues as unknown as Omit<IssueListItem, "project">[])
      .filter(issue => canSeeProject(scope, issue.ProjekId) && (!projectId || issue.ProjekId === projectId))
      .map((issue): IssueListItem => ({
        ...issue,
        ReporterName: reporters.get(String(issue.ReporterId)) ?? null,
        project: names.has(issue.ProjekId) ? { id: issue.ProjekId, name: names.get(issue.ProjekId)! } : null,
      }));
    return Response.json({ issues: items }, { headers: { "Cache-Control": "no-store" } });
  }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Cannot load issues." }, { status: 503 }); }
}

// POST /api/issues — { projectId, issue: { title, description, expectedBehavior?, screenshotRef? } }; auto-triaged by rules
export async function POST(request: Request) {
  const denied = requireRole(request);
  if (denied) return denied;
  let submission;
  try { submission = validateSubmission(await request.json()); }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Invalid issue." }, { status: 400 }); }
  try {
    const [project, scope] = await Promise.all([getProject(submission.projectId), viewerScope(sessionFromRequest(request))]);
    // Reporters can only file issues against projects they own.
    if (!project || !canSeeProject(scope, project.id)) return Response.json({ error: "Project not found." }, { status: 404 });
    const issueId = await saveIssue(project, submission.issue, sessionFromRequest(request)?.id);
    // Instant keyword triage so new reports are never unclassified; developers can re-triage with Bob.
    const { title, description, expectedBehavior, actualBehavior, errorLog } = submission.issue;
    const triage = triageWithRules({ title, description, expectedBehavior, actualBehavior, errorLog });
    await saveTriage(issueId, triage, false).catch(() => undefined);
    return Response.json({ issueId, triage }, { status: 201 });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Cannot save issue." }, { status: 503 }); }
}
