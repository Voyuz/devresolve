# IBM Bob agent integration PoC

## Flow

`/issues/new` loads projects from `GET /api/projects`. The selector prefers the
existing `demo-login-app` record when it is present, with no static fallback.
Submitting sends only the database project ID and issue fields. The API resolves
`NameProjek`/`RepoUrl`/`DefaultBranch` from Supabase, creates an issue and job
transactionally, verifies Bob Shell, shallow-clones GitHub into a unique OS temp
directory, and creates `devresolve/issue-<database issue ID>`.

The prompt asks Bob to read applicable AGENTS.md, investigate, make the smallest
fix, test/build, revise after failures, and escalate security-sensitive or ambiguous
decisions. It does not prohibit the explicitly requested case-normalization fix,
but does prohibit weakening authentication, changing authorization, and destructive
data changes. No automatic commit, push, PR, or merge is requested.

Bob runs synchronously in the clone. An allowlisted NDJSON parser surfaces file
reads/edits, command categories, observed test/build results and completion only.
Reasoning, user/assistant message events, raw tool outputs and arbitrary command
arguments are not sent to the UI. The final result block is extracted only from
the `result.last_message` field. A nonzero exit, stream error, missing summary,
skipped validation, or unrecovered observed validation failure cannot become
READY_FOR_REVIEW. Task IDs come from `result.stats.task_id`.

Results are redacted and saved to Supabase. The returned job URL restores the
result after refresh. `/bob-test` uses the same form and remains available.

## Required configuration

- Node.js 24+ and Git on the server PATH.
- Bob Shell 2 installed and `bob run --help` working. Installation is documented
  by [IBM](https://bob.ibm.com/docs/shell/getting-started/install-and-setup).
- `NEXT_PUBLIC_SUPABASE_URL` and server-only `SUPABASE_SERVICE_ROLE_KEY`.
- `BOB_API_KEY` (official Bob Shell 2 name), or the existing server variable
  `BOBSHELL_API_KEY`. The runner maps that fallback to the child's `BOB_API_KEY`.
  If both are populated, BOB_API_KEY takes precedence. Never log either value.
- Leave `BOB_SHELL_EXECUTABLE` blank for automatic PATH and standard npm location
  discovery using the current server's user/environment. An absolute executable
  or JavaScript path remains an optional override for custom installs. Windows npm shims are resolved
  directly to their JS entry, without a shell.
- Optional `BOB_TEAM_ID`: required by IBM for a general-scope key; not required
  for an Inference key. No key is passed as a command argument.
- Optional existing `DEVRESOLVE_DEMO_REPORTER_ID`, `DEVRESOLVE_DEMO_ISSUE_CATEGORY`,
  `DEVRESOLVE_DEMO_ISSUE_STATUS` when the team's schema requires specific values.

The child receives only required OS/runtime environment, proxy configuration and
the chosen Bob key. Supabase/GitHub/application credentials are not inherited.
The existing `docs/supabase-bob.sql` migration must be applied before running the
database-backed demo. No migration or project seed is run automatically.

## Exact invocation

```text
bob run --mode agent --format stream-json --trust --accept-license --disable-mcp --disable-subagents --log-level error --max-turns 40
```

The prompt goes to stdin through Node `spawn`, with `cwd` set to the unique clone.
If configured, `--team-id <BOB_TEAM_ID>` is appended. The preflight uses
`bob run --help` and rejects incompatible installations rather than guessing old
CLI flags. Bob Shell 2's noninteractive run mode preapproves tools; the workspace
is explicitly scoped to the temporary clone. Format/options follow
[IBM's noninteractive documentation](https://bob.ibm.com/docs/shell/getting-started/start-bobshell-non-interactive).
Default timeout is ten minutes; output capture is capped at 16 MB.

## Test with the existing project

1. Check the existing Supabase `projects` row, without creating a duplicate:
   `NameProjek=demo-login-app`, `RepoUrl=https://github.com/minakdjinggoai-bit/demo-login-app`,
   `DefaultBranch=main`. The repository URL is not hardcoded into the runner.
2. Configure the local variables above. Restart Next.js to pick up keys and PATH.
3. Run `npm run dev`, open `http://localhost:3000/issues/new`, select demo-login-app.
4. Submit this exact text:

Title:

```text
Login gagal ketika email menggunakan huruf kapital
```

Description:

```text
User terdaftar menggunakan email user@example.com.
Ketika login menggunakan User@Example.com, login gagal.
Email login seharusnya diperlakukan case-insensitive.
```

Expected behavior (optional):

```text
Login dengan User@Example.com berhasil untuk akun user@example.com, tanpa mengubah verifikasi password.
```

5. Text-only submission works. Optional file input saves filename, size and MIME
   metadata in screenshot_ref; it does not upload or analyze contents. Alternatively
   enter an existing screenshot reference. Do not attach credential screenshots.
6. Review status, root cause, files, validation and Agent Activity. On human
   escalation, review reason, repository, local branch and Bob task ID.
7. Refresh the completed job URL and confirm the saved result remains available.

Example API body (replace projectId with the actual database ID):

```json
{
  "projectId": "1",
  "issue": {
    "title": "Login gagal ketika email menggunakan huruf kapital",
    "description": "User terdaftar menggunakan email user@example.com. Ketika login menggunakan User@Example.com, login gagal. Email login seharusnya diperlakukan case-insensitive."
  }
}
```

Client-supplied issueId/repository/branch are not trusted. IDs are allocated by
the database; legacy requests using project.id still resolve that ID server-side.

## Verification and limits

Run `npm run test:bob`, `npm run typecheck`, `npm run lint`, `npm run build`.
Contract tests use a clearly labeled fake process to exercise spawn/stdin/cwd,
split JSON, scoped environment, exit codes and timeouts, not to claim an IBM run.
The real demo repository's main branch, temporary clone, fix branch and cleanup
have been verified separately. Its package exposes dev, start, test and build.

This is a synchronous local PoC: no authentication, durable worker,
deployment, automatic PR/merge or IDE deep link. The form opts into an NDJSON
response with safe live activity, job ID, elapsed time and final result. Existing
JSON API clients keep their original response. No raw reasoning or tool output
is streamed. Bob stops after 180 seconds without output or 10 minutes total;
partial safe activity is included in a failed result. The process must remain running
until completion. Execution errors are persisted as FAILED where database access
works. Save failures are explicit. The temp clone is removed after execution;
the original investigation branch is local metadata. New successful jobs capture
the actual code snapshot and diff before cleanup. Apply `supabase-review.sql` and
follow [GitHub review setup](github-review.md) to approve or reject changes.
Only explicit human approval publishes a commit to a separate GitHub fix branch.
Old jobs cannot publish because their workspaces were removed without artifacts.

At implementation time, Bob was not on the executing server process's PATH, and
Supabase URL/service-role key were absent. Therefore a real paid Bob run and DB
round trip were not performed; completing configuration is required to prove the
entire flow. The UI reports configuration errors rather than displaying fake data.

After successful testing, save the IBM Bob IDE Task Session Summary screenshot as:
`bob_sessions/member05_task03_bob_agent_demo_login_summary.png`.
Keep AGENTS.md, existing evidence and security ignore rules intact. Do not include keys.
