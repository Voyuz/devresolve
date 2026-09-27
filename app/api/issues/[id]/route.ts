import { databaseId } from "@/lib/bob/request";
import { requireRole, sessionFromRequest } from "@/lib/auth/session";
import { viewerScope } from "@/lib/supabase/projects";
import { canSeeProject } from "@/lib/auth/scope";
import { getIssueDetail, saveTriage } from "@/lib/supabase/issues";
import { profileNames } from "@/lib/auth/profiles";
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
    const [project, names] = await Promise.all([detail.issue.project_id ? getProject(detail.issue.project_id) : null, profileNames()]);
    const reporterName = names.get(String(detail.issue.reporter_id)) ?? null;
    return Response.json({ ...detail, issue: { ...detail.issue, reporter_name: reporterName }, project }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Cannot load issue." }, { status: 503 });
  }
}

// PATCH /api/issues/:id — manual triage override: { category?, severity?, priority? }
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
  if (!Object.keys(values).length) return Response.json({ error: "Provide category, severity, or priority." }, { status: 400 });
  try {
    if (!await saveTriage(id, values, true)) return Response.json({ error: "Issue not found." }, { status: 404 });
    return Response.json({ ok: true, ...values });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Cannot update issue." }, { status: 503 });
  }
}
