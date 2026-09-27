import { requireRole } from "@/lib/auth/session";
import { inspectSetup, setupJob, startSetup } from "@/lib/bob/setup";
import { validateSetupRequest } from "@/lib/bob/setup-request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = requireRole(request, "developer");
  if (denied) return denied;
  try {
    validateSetupRequest(request);
    return Response.json(await inspectSetup(), { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Cannot inspect setup." }, { status: 403 }); }
}
export async function POST(request: Request) {
  const denied = requireRole(request, "developer");
  if (denied) return denied;
  try { validateSetupRequest(request, await request.json()); }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Invalid setup request." }, { status: 403 }); }
  try {
    const started = startSetup();
    return Response.json({ job: setupJob() }, { status: started ? 202 : 409 });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Cannot start setup." }, { status: 503 }); }
}
