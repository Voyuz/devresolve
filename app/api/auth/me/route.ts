import { sessionFromRequest } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

// GET /api/auth/me — the signed-in profile (id, name, role) or 401.
export async function GET(request: Request) {
  const session = sessionFromRequest(request);
  if (!session) return Response.json({ user: null }, { status: 401 });
  return Response.json({ user: { id: session.id, name: session.name, role: session.role } }, { headers: { "Cache-Control": "no-store" } });
}
