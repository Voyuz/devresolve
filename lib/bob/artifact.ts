import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { join } from "node:path";
import type { BobArtifact } from "../../types/bob";
import { gitEnvironment } from "./git-environment.ts";

const execute = promisify(execFile);
export function assertReviewPath(path: string) {
  if (!path || path.startsWith("/") || path.includes("\\") || path.split("/").some(part => !part || part === ".." || part === ".") ||
    /[\x00-\x1f]/.test(path) || /(^|\/)(\.git|\.env[^/]*|node_modules|\.next|\.vercel)(\/|$)|credential|secret|api.?key|\.(pem|key|p12|pfx)$|^\.github\/workflows\//i.test(path)) {
    throw new Error("The fix contains a sensitive or unsupported file path. Review it manually.");
  }
}

export async function workspaceHead(workspacePath: string) {
  const { stdout } = await execute("git", ["rev-parse", "HEAD"], { cwd: workspacePath, timeout: 15000, env: gitEnvironment() });
  return stdout.trim();
}

const generatedDirectories = ["node_modules", ".next", ".vercel", ".turbo", "dist", "build", "out", "coverage"];

/** Capture source changes in a separate index, independent of Bob's staging. */
export async function captureArtifact(workspacePath: string, baseSha: string, secrets: (string | undefined)[]): Promise<BobArtifact | null> {
  if (await workspaceHead(workspacePath) !== baseSha) throw new Error("Bob changed repository history; automatic review publishing is disabled.");
  const env = { ...gitEnvironment(), GIT_INDEX_FILE: join(workspacePath, ".git", "devresolve-review.index") };
  const git = async (args: string[]) => {
    try { return await execute("git", args, { cwd: workspacePath, timeout: 15000, maxBuffer: 3 * 1024 * 1024, env }); }
    catch { throw new Error("Cannot capture the source-code diff. Check the temporary repository; generated files are excluded from review."); }
  };
  // Restore the original tree in our index. Bob may already have staged build
  // outputs; using its index would retain those files even with path exclusions.
  await git(["read-tree", baseSha]);
  const exclusions = generatedDirectories.map(directory => `:(glob,exclude)**/${directory}/**`);
  await git(["-c", "core.quotePath=false", "add", "-A", "--", ".", ...exclusions]);
  const names = (await git(["diff", "--cached", "--no-renames", "--name-only", "-z", baseSha, "--"])).stdout.split("\0").filter(Boolean);
  if (!names.length) return null;
  if (names.length > 100) throw new Error("Fix exceeds the automatic review limit of 100 files.");
  const files: BobArtifact["files"] = [];
  let totalBytes = 0;
  for (const path of names) {
    assertReviewPath(path);
    const entry = (await git(["ls-files", "--stage", "--", path])).stdout;
    if (!entry) {
      if (path === "AGENTS.md" || path.startsWith("bob_sessions/")) throw new Error("Hackathon artifacts cannot be deleted by automatic fixes.");
      files.push({ path, mode: "100644", content: null });
      continue;
    }
    const mode = entry.split(" ")[0];
    if (mode !== "100644" && mode !== "100755") throw new Error("Symlinks and submodules require manual review.");
    const { stdout: content } = await git(["show", `:${path}`]);
    totalBytes += Buffer.byteLength(content);
    if (content.includes("\0") || content.includes("\uFFFD") || totalBytes > 2 * 1024 * 1024) throw new Error("Only text fixes up to 2 MB can be reviewed automatically.");
    if (secrets.some(secret => secret && content.includes(secret)) || /sb_secret_[\w-]+|gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[\w]+|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(content)) {
      throw new Error("A possible secret was detected in the fix. Nothing will be published; rotate any exposed key and review manually.");
    }
    files.push({ path, mode, content });
  }
  const patch = (await git(["diff", "--cached", "--no-ext-diff", "--no-textconv", "--no-renames", baseSha, "--"])).stdout;
  if (secrets.some(secret => secret && patch.includes(secret)) || /sb_secret_[\w-]+|gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[\w]+|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(patch)) throw new Error("A secret was detected in the review diff; automatic publishing is disabled.");
  return { baseSha, files, patch, createdAt: new Date().toISOString() };
}
