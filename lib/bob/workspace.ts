/**
 * workspace.ts
 *
 * Creates and manages a temporary Git workspace for each Bob job.
 * Clones the target repository, checks out the base branch, and
 * creates a fix branch scoped to the issue.
 *
 * All operations run server-side only.
 */

import { execFile } from "child_process";
import { mkdtemp, rm } from "fs/promises";
import { tmpdir } from "os";
import { basename, isAbsolute, join, relative, resolve } from "path";
import { promisify } from "util";
import { gitEnvironment } from "./git-environment.ts";

const execFileAsync = promisify(execFile);

export interface WorkspaceInfo {
  /** Absolute path to the temporary clone */
  workspacePath: string;
  /** The fix branch that was created */
  fixBranch: string;
  branchName: string;
  repoUrl: string;
  /** Clean up function — always call when done */
  cleanup: () => Promise<void>;
}

/**
 * Validates that a repository URL looks like a safe GitHub HTTPS URL.
 * Rejects anything that is not a plain github.com HTTPS URL to prevent
 * shell injection via the repoUrl field.
 */
export function validateRepoUrl(repoUrl: string): void {
  let parsed: URL;
  try {
    parsed = new URL(repoUrl);
  } catch {
    throw new Error("Invalid repository URL in the selected project.");
  }
  if (parsed.protocol !== "https:") {
    throw new Error("The selected project's repository URL must use HTTPS.");
  }
  if (parsed.hostname !== "github.com") {
    throw new Error("Only github.com repositories are supported.");
  }
  if (parsed.username || parsed.password || parsed.port || parsed.search || parsed.hash ||
      !/^\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\.git)?\/?$/.test(parsed.pathname)) {
    throw new Error("Use a plain HTTPS GitHub repository URL without credentials or query parameters.");
  }
  // Path must match /owner/repo or /owner/repo.git — no extra segments
  const pathParts = parsed.pathname.replace(/\.git$/, "").split("/").filter(Boolean);
  if (pathParts.length !== 2) {
    throw new Error("Repository URL path must be /owner/repo.");
  }
}

/**
 * Creates a temporary workspace by:
 * 1. Making a temp directory under the OS temp folder.
 * 2. Cloning the repository (shallow clone for speed).
 * 3. Checking out the requested base branch.
 * 4. Creating a fix branch named devresolve/issue-<issueId>.
 */
export async function createWorkspace(
  repoUrl: string,
  baseBranch: string,
  issueId: string
): Promise<WorkspaceInfo> {
  validateRepoUrl(repoUrl);
  if (!baseBranch || baseBranch.length > 250 || baseBranch.startsWith("-")) {
    throw new Error("The project's default branch is invalid.");
  }
  try {
    await execFileAsync("git", ["check-ref-format", "--branch", baseBranch], { timeout: 15000, env: gitEnvironment() });
  } catch {
    throw new Error("Invalid default branch or Git is unavailable on the server.");
  }

  // Sanitise issueId — only allow alphanumeric, hyphen, and underscore
  const safeIssueId = issueId.replace(/[^a-zA-Z0-9_-]/g, "-");
  const fixBranch = `devresolve/issue-${safeIssueId}`;

  const tmpBase = tmpdir();
  const workspacePath = await mkdtemp(join(tmpBase, "devresolve-"));
  const cleanup = async () => {
    // Verify the computed recursive-delete target remains inside our temp root.
    const child = relative(resolve(tmpBase), resolve(workspacePath));
    if (!child || child.startsWith("..") || isAbsolute(child) || !basename(workspacePath).startsWith("devresolve-")) {
      throw new Error("Refusing cleanup outside the DevResolve temporary workspace.");
    }
    await rm(workspacePath, { recursive: true, force: true });
  };

  try {
    // Shallow clone to keep it fast for demo
    await execFileAsync(
      "git", ["clone", "--depth", "1", "--branch", baseBranch, "--", repoUrl, "."],
      { cwd: workspacePath, timeout: 120_000, env: gitEnvironment() }
    );

    // Create and switch to the fix branch
    await execFileAsync("git", ["checkout", "-b", fixBranch], {
      cwd: workspacePath,
      timeout: 15_000,
      env: gitEnvironment(),
    });
  } catch (err) {
    // Clean up the temp directory if setup fails
    await cleanup().catch(() => undefined);
    throw new Error(
      `Failed to set up workspace for ${repoUrl}: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  return { workspacePath, fixBranch, branchName: fixBranch, repoUrl, cleanup };
}
