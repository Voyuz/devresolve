import { validateSubmission } from "@/lib/bob/request";
import { getProject } from "@/lib/supabase/bob-store";
import { listIssues, saveIssue } from "@/lib/supabase/issues";

export async function GET() {
  try { return Response.json({ issues: await listIssues() }); }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Cannot load issues." }, { status: 503 }); }
}
export async function POST(request: Request) {
  let submission;
  try { submission = validateSubmission(await request.json()); }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Invalid issue." }, { status: 400 }); }
  try {
    const project = await getProject(submission.projectId);
    if (!project) return Response.json({ error: "Project not found." }, { status: 404 });
    return Response.json({ issueId: await saveIssue(project, submission.issue) }, { status: 201 });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Cannot save issue." }, { status: 503 }); }
}
