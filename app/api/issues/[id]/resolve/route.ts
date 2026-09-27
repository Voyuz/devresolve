import { databaseId } from "@/lib/bob/request";
import { requireRole, sessionFromRequest } from "@/lib/auth/session";
import { reopenIssue, resolveIssue } from "@/lib/supabase/issues";
import { validateResolution } from "@/lib/resolution-input";

// POST /api/issues/:id/resolve — developers only: { note, url? } marks a human-handled issue as resolved.
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = requireRole(request, "developer");
  if (denied) return denied;
  const id = databaseId((await context.params).id);
  if (!id) return Response.json({ error: "Invalid issue ID." }, { status: 400 });
  let resolution;
  try { resolution = validateResolution(await request.json()); }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Invalid resolution." }, { status: 400 }); }
  try {
    if (!await resolveIssue(id, resolution, sessionFromRequest(request)!.id)) return Response.json({ error: "Issue not found." }, { status: 404 });
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Cannot resolve the issue." }, { status: 503 });
  }
}

// DELETE /api/issues/:id/resolve — developers only: reopens a resolved issue.
export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = requireRole(request, "developer");
  if (denied) return denied;
  const id = databaseId((await context.params).id);
  if (!id) return Response.json({ error: "Invalid issue ID." }, { status: 400 });
  try {
    if (!await reopenIssue(id)) return Response.json({ error: "Issue not found." }, { status: 404 });
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Cannot reopen the issue." }, { status: 503 });
  }
}
