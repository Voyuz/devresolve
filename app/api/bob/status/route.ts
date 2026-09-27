import { checkBobAvailability } from "@/lib/bob/runner";
import { getAttentionCounts } from "@/lib/supabase/issues";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// `bob run --help` spawns a process; cache the answer so every page poll does not.
let cachedAvailability: { expires: number; ready: boolean; reason: string | null } | undefined;

async function availability() {
  if (cachedAvailability && cachedAvailability.expires > Date.now()) return cachedAvailability;
  let ready = true, reason: string | null = null;
  try { await checkBobAvailability(); } catch (error) { ready = false; reason = error instanceof Error ? error.message : "Bob Shell is unavailable."; }
  cachedAvailability = { expires: Date.now() + 60_000, ready, reason };
  return cachedAvailability;
}

// GET /api/bob/status — whether this server can run Bob, plus work waiting for developers.
export async function GET() {
  try {
    const [bob, counts] = await Promise.all([availability(), getAttentionCounts()]);
    return Response.json({ ready: bob.ready, reason: bob.reason, ...counts }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Cannot load status." }, { status: 503 });
  }
}
