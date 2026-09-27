// Validation for registering a project (pure; shared by the API route and tests).
import { validateRepoUrl } from "./bob/workspace.ts";

export function validateNewProject(value: unknown) {
  const body = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const repoUrl = typeof body.repoUrl === "string" ? body.repoUrl.trim() : "";
  const defaultBranch = typeof body.defaultBranch === "string" && body.defaultBranch.trim() ? body.defaultBranch.trim() : "main";
  // Developers register projects on behalf of a reporter (projects.profil_id).
  const ownerId = typeof body.ownerId === "string" || typeof body.ownerId === "number" ? String(body.ownerId) : "";
  if (name.length < 2 || name.length > 100) throw new Error("Project name must be 2-100 characters.");
  try { validateRepoUrl(repoUrl); }
  catch { throw new Error("Use a plain public GitHub HTTPS URL, such as https://github.com/owner/repo."); }
  if (!/^[A-Za-z0-9._/-]{1,100}$/.test(defaultBranch) || defaultBranch.startsWith("-") || defaultBranch.includes("..")) {
    throw new Error("Enter a valid branch name, for example main.");
  }
  if (!/^[1-9]\d{0,18}$/.test(ownerId)) throw new Error("Choose the user who owns this project.");
  return { name, repoUrl, defaultBranch, ownerId };
}
