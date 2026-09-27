import { listProjects } from "@/lib/supabase/bob-store";
import { listIssues, listJobSummaries } from "@/lib/supabase/issues";
import { profileNames } from "@/lib/auth/profiles";
import { viewerScope } from "@/lib/supabase/projects";
import { scopeWorkspace } from "@/lib/auth/scope";
import { sessionFromRequest } from "@/lib/auth/session";
import type { WorkspaceIssue, WorkspaceJob } from "@/components/layout/use-workspace";

// GET /api/workspace — projects, issues, and Bob jobs visible to the signed-in profile.
export async function GET(request: Request) {
  try {
    const [projects, rawIssues, jobs, names, scope] = await Promise.all([
      listProjects(), listIssues(), listJobSummaries(), profileNames(), viewerScope(sessionFromRequest(request)),
    ]);
    // reporter_id holds a profile ID for signed-in reporters; older rows keep their original text.
    const issues = (rawIssues as unknown as WorkspaceIssue[]).map(issue => ({ ...issue, ReporterName: names.get(String(issue.ReporterId)) ?? null }));
    const visible = scopeWorkspace(scope, { projects, issues, jobs: jobs as unknown as WorkspaceJob[] });
    return Response.json(visible, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Cannot load workspace." }, { status: 503 }); }
}
