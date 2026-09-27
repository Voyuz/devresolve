import { databaseId } from "@/lib/bob/request";
import { requireRole, sessionFromRequest } from "@/lib/auth/session";
import { viewerScope } from "@/lib/supabase/projects";
import { canSeeProject } from "@/lib/auth/scope";
import { assignIssue, getIssueDetail, getResolution, listAssignments, saveTriage } from "@/lib/supabase/issues";
import { listProfiles, profileNames } from "@/lib/auth/profiles";
import { getProject } from "@/lib/supabase/bob-store";
import { ISSUE_CATEGORIES, PRIORITY_LEVELS, SEVERITY_LEVELS, type PriorityLevel, type SeverityLevel } from "@/types/issues";

export const dynamic = "force-dynamic";

// GET /api/issues/:id — issue, its project, and every Bob round (oldest first)
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const id = databaseId((await context.params).id);
  if (!id) return Response.json({ error: "Invalid issue ID." }, { status: 400 });
  try {
    const [detail, scope] = await Promise.all([getIssueDetail(id), viewerScope(sessionFromRequest(request))]);
    // Reporters only see issues of their own projects; others look like missing issues.
    if (!detail || !canSeeProject(scope, detail.issue.project_id)) return Response.json({ error: "Issue not found." }, { status: 404 });
    const [project, names, assignments, resolution] = await Promise.all([
      detail.issue.project_id ? getProject(detail.issue.project_id) : null, profileNames(), listAssignments(), getResolution(id)]);
    const reporterName = names.get(String(detail.issue.reporter_id)) ?? null;
    const assigneeId = assignments?.get(id) ?? null;
    return Response.json({ ...detail, issue: { ...detail.issue, reporter_name: reporterName,
      assignee_id: assigneeId, assignee_name: assigneeId ? names.get(assigneeId) ?? null : null },
      // resolution: null = none yet; resolutionEnabled: false until docs/supabase-resolution.sql is run.
      resolution: resolution ? { ...resolution, resolvedByName: resolution.resolvedBy ? names.get(resolution.resolvedBy) ?? null : null } : null,
      resolutionEnabled: resolution !== undefined, project }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Cannot load issue." }, { status: 503 });
  }
}

// PATCH /api/issues/:id — developers only: triage override { category?, severity?, priority? }
// and/or human assignment { assigneeId: "<developer profile id>" | null }.
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = requireRole(request, "developer");
  if (denied) return denied;
  const id = databaseId((await context.params).id);
  if (!id) return Response.json({ error: "Invalid issue ID." }, { status: 400 });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid JSON body." }, { status: 400 }); }
  const values: { category?: string; severity?: SeverityLevel; priority?: PriorityLevel } = {};
  if (body.category !== undefined) {
    if (!ISSUE_CATEGORIES.includes(body.category as (typeof ISSUE_CATEGORIES)[number])) return Response.json({ error: "Invalid category." }, { status: 400 });
    values.category = body.category as string;
  }
  if (body.severity !== undefined) {
    if (!SEVERITY_LEVELS.includes(body.severity as SeverityLevel)) return Response.json({ error: "Invalid severity." }, { status: 400 });
    values.severity = body.severity as SeverityLevel;
  }
  if (body.priority !== undefined) {
    if (!PRIORITY_LEVELS.includes(body.priority as PriorityLevel)) return Response.json({ error: "Invalid priority." }, { status: 400 });
    values.priority = body.priority as PriorityLevel;
  }
  const assigning = body.assigneeId !== undefined;
  if (assigning && body.assigneeId !== null && !databaseId(body.assigneeId)) return Response.json({ error: "Invalid assignee." }, { status: 400 });
  if (!Object.keys(values).length && !assigning) return Response.json({ error: "Provide category, severity, priority, or assigneeId." }, { status: 400 });
  try {
    let assigneeId: string | null = null;
    if (assigning && body.assigneeId !== null) {
      // Issues are assigned to developers only (reporters cannot work on fixes).
      const assignee = (await listProfiles()).find(profile => profile.id === databaseId(body.assigneeId));
      if (!assignee || assignee.role !== "developer") return Response.json({ error: "Choose a developer to assign." }, { status: 400 });
      assigneeId = assignee.id;
    }
    if (assigning && !await assignIssue(id, assigneeId)) return Response.json({ error: "Issue not found." }, { status: 404 });
    if (Object.keys(values).length && !await saveTriage(id, values, true)) return Response.json({ error: "Issue not found." }, { status: 404 });
    return Response.json({ ok: true, ...values, ...(assigning ? { assigneeId } : {}) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Cannot update issue." }, { status: 503 });
  }
}
