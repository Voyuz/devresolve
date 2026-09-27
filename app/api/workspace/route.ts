import { listProjects } from "@/lib/supabase/bob-store";
import { listIssues, listJobSummaries } from "@/lib/supabase/issues";
export async function GET() {
  try {
    const [projects, issues, jobs] = await Promise.all([listProjects(), listIssues(), listJobSummaries()]);
    return Response.json({ projects, issues, jobs }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Cannot load workspace." }, { status: 503 }); }
}
