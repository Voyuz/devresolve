type SaveResponse = { data: unknown; error: { code?: string; message?: string } | null };

/** Retrying the same artifact update is idempotent; never rerun the agent. */
export async function persistReviewArtifact(save: () => PromiseLike<SaveResponse>, wait = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data, error } = await save();
    if (!error && data) return;
    const code = error?.code || "";
    if (["42703", "PGRST204", "PGRST205"].includes(code)) {
      throw new Error("Review columns are missing from the database/API schema. Run docs/supabase-review.sql in Supabase SQL Editor.");
    }
    const transient = !code || /^5\d\d$/.test(code) || code === "429" || /fetch failed|network|timeout|timed out/i.test(error?.message || "");
    if (attempt < 2 && transient && error) {
      await wait(250 * (attempt + 1));
      continue;
    }
    // Expose the diagnostic code only, never raw DB messages/values.
    const safeCode = /^[A-Za-z0-9_]{1,20}$/.test(code) ? code : "NETWORK_OR_UNKNOWN";
    throw new Error(`Cannot save review artifact (code: ${safeCode}). Check Supabase connectivity, write permissions and table constraints. The review migration may already be installed.`);
  }
}
