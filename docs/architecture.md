# Architecture

DevResolve is a Next.js App Router application. Pages are client components that call route handlers.
All database, Bob, and GitHub access happens on the server.

```
Browser (reporter / developer pages)
   │  fetch
   ▼
Route handlers (app/api)
   ├─ /api/workspace, /api/issues, /api/issues/[id]      → lib/supabase (service role, server only)
   ├─ /api/issues/[id]/triage                            → lib/triage (Bob one-turn classification | keyword rules)
   ├─ /api/bob/resolve  (NDJSON progress stream)         → lib/bob: workspace → npm ci → Bob Shell → parser → artifact
   └─ /api/bob/jobs/[id]/review (approve/request/reject) → lib/github/publish (fix branch commit)
   ▼
Supabase: projects, issues, bob_jobs (result, artifact, review_status), profiles, bob_sessions
```

## Bob resolution run

1. The job is saved as `QUEUED`. The repository is shallow-cloned into `%TEMP%/devresolve-*`, and a fix branch is created.
2. Dependencies are installed with `npm ci` before Bob starts. This keeps Bob's own install fast and within its idle watchdog.
3. Bob Shell runs in agent mode (`--format stream-json`, max 40 turns, 10-minute limit, 3-minute idle watchdog).
   The prompt comes from `lib/bob/prompt-builder.ts`. For a follow-up round it also contains the reviewer
   feedback and the previous patch.
4. `lib/bob/parser.ts` turns the stream into safe activity events. Command arguments and reasoning are not surfaced.
   The final `DEVRESOLVE_RESULT` block is only trusted when observed test/build results agree with it.
5. For `READY_FOR_REVIEW`, `lib/bob/artifact.ts` captures the source diff (generated folders and secrets excluded)
   into `bob_jobs.artifact`, and `review_status` becomes `PENDING`.
6. The temporary clone is deleted (with retries for Windows file locks).

## Review states (`bob_jobs.review_status`)

`PENDING` → `PUBLISHING` → `APPROVED` (or `PUBLISH_FAILED`, retryable) · `PENDING` → `REJECTED` ·
`PENDING` → `CHANGES_REQUESTED` (feedback saved in `result.review.feedback`, next round references it through
`result.previousJobId`). Rounds for an issue are all `bob_jobs` rows with that `issue_id`, ordered by creation time.

## Triage

`issues.category_issues`, `severity` (`low|medium|high|critical`), and `priority` (`low|medium|high|urgent`) are
written by triage or manual override. A still-`reported` issue moves to `triaged`; later statuses are never regressed.
