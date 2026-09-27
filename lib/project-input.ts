// Validation for registering a project (pure; shared by the API route and tests).
import { validateRepoUrl } from "./bob/workspace.ts";

export function validateNewProject(value: unknown) {
  const body = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const repoUrl = typeof body.repoUrl === "string" ? body.repoUrl.trim() : "";
  const defaultBranch = typeof body.defaultBranch === "string" && body.defaultBranch.trim() ? body.defaultBranch.trim() : "main";
  if (name.length < 2 || name.length > 100) throw new Error("Project name must be 2-100 characters.");
  try { validateRepoUrl(repoUrl); }
  catch { throw new Error("Use a plain public GitHub HTTPS URL, such as https://github.com/owner/repo."); }
  if (!/^[A-Za-z0-9._/-]{1,100}$/.test(defaultBranch) || defaultBranch.startsWith("-") || defaultBranch.includes("..")) {
    throw new Error("Enter a valid branch name, for example main.");
  }
  return { name, repoUrl, defaultBranch };
}
