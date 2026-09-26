import { getJob } from "@/lib/supabase/bob-store";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return Response.json({ error: "Invalid job ID." }, { status: 400 });
  }
  try {
    const job = await getJob(id);
    return job ? Response.json({ job }) : Response.json({ error: "Job not found." }, { status: 404 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Cannot load job." }, { status: 503 });
  }
}
