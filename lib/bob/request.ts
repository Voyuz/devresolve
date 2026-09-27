import type { BobIssue } from "@/types/bob";

export function databaseId(value: unknown): string | null {
  const id = typeof value === "string" ? value :
    typeof value === "number" && Number.isSafeInteger(value) ? String(value) : "";
  return /^[1-9]\d{0,18}$/.test(id) && BigInt(id) <= BigInt("9223372036854775807") ? id : null;
}

export function validateSubmission(value: unknown): { projectId: string; issue: BobIssue } {
  if (!value || typeof value !== "object") throw new Error("Request body must be an object.");
  const body = value as Record<string, unknown>;
  const project = body.project as Record<string, unknown> | undefined;
  const projectId = databaseId(body.projectId ?? project?.id);
  if (!projectId) throw new Error("projectId must be a positive database ID.");
  if (!body.issue || typeof body.issue !== "object") throw new Error("issue is required.");
  const issue = body.issue as Record<string, unknown>;
  function text(name: string, max: number, required = false) {
    const value = issue[name];
    if (value === undefined && !required) return undefined;
    if (typeof value !== "string" || value.trim().length > max || (required && !value.trim())) {
      throw new Error(`Invalid issue.${name} (maximum ${max} characters).`);
    }
    return value.trim() || undefined;
  }
  return { projectId, issue: {
    title: text("title", 250, true)!,
    description: text("description", 20000, true)!,
    expectedBehavior: text("expectedBehavior", 10000),
    screenshotRef: text("screenshotRef", 2000),
  } };
}
