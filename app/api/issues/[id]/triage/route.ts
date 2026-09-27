import { databaseId } from "@/lib/bob/request";
import { requireRole } from "@/lib/auth/session";
import { getTriageInput, saveTriage } from "@/lib/supabase/issues";
import { triageWithBob } from "@/lib/triage/bob";
import { triageWithRules } from "@/lib/triage/rules";

export const runtime = "nodejs";

// POST /api/issues/:id/triage — { engine?: "bob" | "rules" } (default "bob", falls back to rules)
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = requireRole(request, "developer");
  if (denied) return denied;
  const id = databaseId((await context.params).id);
  if (!id) return Response.json({ error: "Invalid issue ID." }, { status: 400 });
  let engine = "bob";
  try {
    const body = await request.json().catch(() => ({}));
    if (body && typeof body === "object" && "engine" in body) engine = String(body.engine);
  } catch { /* empty body is fine */ }
  if (engine !== "bob" && engine !== "rules") return Response.json({ error: "engine must be bob or rules." }, { status: 400 });
  try {
    const issue = await getTriageInput(id);
    if (!issue) return Response.json({ error: "Issue not found." }, { status: 404 });
    const triage = engine === "bob" ? await triageWithBob(issue.input) : triageWithRules(issue.input);
    await saveTriage(id, triage, true);
    return Response.json({ triage });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Triage failed." }, { status: 503 });
  }
}
