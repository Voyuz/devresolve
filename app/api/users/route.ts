import { listProfiles } from "@/lib/auth/profiles";
import { requireRole } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

// GET /api/users — developers only: accounts (id, name, role; never passwords) for choosing project owners.
export async function GET(request: Request) {
  const denied = requireRole(request, "developer");
  if (denied) return denied;
  try {
    return Response.json({ users: await listProfiles() }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Cannot load users." }, { status: 503 });
  }
}
