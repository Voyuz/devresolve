import "server-only";
import { validateRepoUrl } from "../bob/workspace.ts";

export type RepoStatus = "CONNECTED" | "ARCHIVED" | "BRANCH_MISSING" | "NOT_FOUND" | "INVALID_URL" | "UNAVAILABLE";

export interface RepoInfo {
  status: RepoStatus;
  description: string | null;
  /** Top languages by bytes of code, largest first. */
  languages: string[];
  pushedAt: string | null;
  stars: number | null;
}

// Public repository metadata changes rarely; caching keeps well within GitHub's unauthenticated rate limit.
const TTL_MS = 10 * 60 * 1000;
const cache = new Map<string, { expires: number; info: RepoInfo }>();

const empty = (status: RepoStatus): RepoInfo => ({ status, description: null, languages: [], pushedAt: null, stars: null });

async function github(path: string) {
  const token = process.env.GITHUB_TOKEN;
  return fetch(`https://api.github.com/repos/${path}`, {
    redirect: "error", signal: AbortSignal.timeout(5000), cache: "no-store",
    headers: { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2026-03-10",
      ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
}

/** Repository description, languages, and whether the project's configured branch exists. Never throws. */
export async function getRepoInfo(repoUrl: string, branch: string): Promise<RepoInfo> {
  try { validateRepoUrl(repoUrl); } catch { return empty("INVALID_URL"); }
  const repo = new URL(repoUrl).pathname.replace(/^\//, "").replace(/\/$/, "").replace(/\.git$/, "");
  const key = `${repo}#${branch}`;
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) return cached.info;

  let info: RepoInfo;
  try {
    const [repoResponse, languagesResponse, branchResponse] = await Promise.all([
      github(repo), github(`${repo}/languages`), github(`${repo}/branches/${encodeURIComponent(branch)}`),
    ]);
    if (repoResponse.status === 404) info = empty("NOT_FOUND");
    else if (!repoResponse.ok) info = empty("UNAVAILABLE");
    else {
      const data = await repoResponse.json() as { description?: string | null; archived?: boolean; pushed_at?: string; stargazers_count?: number };
      const bytes = languagesResponse.ok ? await languagesResponse.json() as Record<string, number> : {};
      info = {
        status: data.archived ? "ARCHIVED" : branchResponse.status === 404 ? "BRANCH_MISSING" : "CONNECTED",
        description: data.description ?? null,
        languages: Object.entries(bytes).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([name]) => name),
        pushedAt: data.pushed_at ?? null,
        stars: typeof data.stargazers_count === "number" ? data.stargazers_count : null,
      };
    }
  } catch {
    info = empty("UNAVAILABLE");
  }
  // Do not cache transient failures for the full TTL.
  cache.set(key, { expires: Date.now() + (info.status === "UNAVAILABLE" ? 60_000 : TTL_MS), info });
  return info;
}
