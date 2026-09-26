import { createHash } from "node:crypto";
import { validateRepoUrl } from "../bob/workspace.ts";
import { assertReviewPath } from "../bob/artifact.ts";
import type { BobArtifact } from "../../types/bob";

type Options = { repoUrl: string; baseBranch: string; branch: string; jobId: string; artifact: BobArtifact; token: string };

/** Publish only the reviewed snapshot on a new branch, never update/force a ref. */
export async function publishArtifact(options: Options, fetcher: typeof fetch = fetch) {
  const { artifact, token, branch, jobId, baseBranch } = options;
  validateRepoUrl(options.repoUrl);
  if (!token) throw new Error("Configure GITHUB_TOKEN on the server with Contents: Read and write for the target repository.");
  if (!/^[a-f0-9]{40}$/.test(artifact.baseSha) || !/^devresolve\/issue-[A-Za-z0-9_-]+$/.test(branch) || !artifact.files.length) throw new Error("Invalid review artifact.");
  for (const file of artifact.files) {
    assertReviewPath(file.path);
    if (!["100644", "100755"].includes(file.mode)) throw new Error("Unsupported file mode.");
  }
  const repo = new URL(options.repoUrl).pathname.replace(/^\//, "").replace(/\/$/, "").replace(/\.git$/, "");
  const root = `https://api.github.com/repos/${repo}`;
  const digest = createHash("sha256").update(JSON.stringify({ baseSha: artifact.baseSha, files: artifact.files })).digest("hex");
  const message = `DevResolve: apply reviewed fix\n\nJob: ${jobId}\nArtifact: ${digest}`;
  async function api(path: string, method = "GET", body?: unknown, allow404 = false) {
    let response: Response;
    try {
      response = await fetcher(root + path, { method, redirect: "error", signal: AbortSignal.timeout(30000),
        headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2026-03-10", "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body) });
    } catch { throw new Error("GitHub request failed. Retry approval to check whether the branch was already published."); }
    if (allow404 && response.status === 404) return null;
    if (!response.ok) throw new Error(`GitHub returned HTTP ${response.status}. Check token repository access, write permission, and branch rules.`);
    return response.json();
  }
  const refPath = `/git/ref/heads/${branch.split("/").map(encodeURIComponent).join("/")}`;
  const existing = await api(refPath, "GET", undefined, true);
  if (existing) {
    const commit = await api(`/git/commits/${existing.object.sha}`);
    if (commit.message !== message || commit.parents?.[0]?.sha !== artifact.baseSha) throw new Error("The target branch already exists with different content. Nothing was overwritten.");
    return { commitUrl: `https://github.com/${repo}/commit/${existing.object.sha}`, branch };
  }
  const base = await api(`/git/ref/heads/${baseBranch.split("/").map(encodeURIComponent).join("/")}`);
  if (base.object.sha !== artifact.baseSha) throw new Error("The base branch changed since Bob investigated. Run Bob again against the latest code before approving.");
  const baseCommit = await api(`/git/commits/${artifact.baseSha}`);
  const tree = [];
  for (const file of artifact.files) {
    const blob = file.content === null ? null : await api("/git/blobs", "POST", { content: file.content, encoding: "utf-8" });
    tree.push({ path: file.path, mode: file.mode, type: "blob", sha: blob?.sha ?? null });
  }
  const newTree = await api("/git/trees", "POST", { base_tree: baseCommit.tree.sha, tree });
  const commit = await api("/git/commits", "POST", { message, tree: newTree.sha, parents: [artifact.baseSha] });
  // Check again after object creation. No existing branch or main ref is updated.
  const latest = await api(`/git/ref/heads/${baseBranch.split("/").map(encodeURIComponent).join("/")}`);
  if (latest.object.sha !== artifact.baseSha) throw new Error("The base branch changed during approval. Nothing was published; run Bob again.");
  await api("/git/refs", "POST", { ref: `refs/heads/${branch}`, sha: commit.sha });
  return { commitUrl: `https://github.com/${repo}/commit/${commit.sha}`, branch };
}
