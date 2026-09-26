import { listProjects } from "@/lib/supabase/bob-store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return Response.json({ projects: await listProjects() });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Cannot load projects." }, { status: 503 });
  }
}
