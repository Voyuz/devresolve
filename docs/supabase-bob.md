# Supabase-backed Bob demo

This integration follows the team's existing schema: `projects.id` (bigint),
`NameProjek`, `RepoUrl`, and `issues.ProjekId`, `ReporterId`, `CategoryIssues`, `Status`.
The existing varchar `ProjekId` is preserved. SQL uses quoted mixed-case names.
No profiles, passwords, or authentication logic are changed.

## Setup

1. Review and run [supabase-bob.sql](supabase-bob.sql) in Supabase SQL Editor.
   It adds `DefaultBranch`, issue evidence fields, and `bob_jobs`, and provides
   a transactional function to create an issue and job together. Missing identity
   defaults are added above existing project/issue IDs. Existing defaults remain.
2. Insert a real project in Table Editor: `NameProjek`, `RepoUrl` (plain public
   GitHub HTTPS URL), `DefaultBranch` (for example `main`). Use a small demo repo.
3. Configure `.env.local` with `NEXT_PUBLIC_SUPABASE_URL`,
   `SUPABASE_SERVICE_ROLE_KEY`, and `BOB_API_KEY` (existing `BOBSHELL_API_KEY` remains
   a supported fallback). Never commit these values.
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` is reserved for future browser/auth integration;
   this demo accesses Supabase only through the server.
4. If ReporterId has a foreign key, set `DEVRESOLVE_DEMO_REPORTER_ID` to an existing
   profile ID. Otherwise it defaults to `demo`. Set `DEVRESOLVE_DEMO_ISSUE_CATEGORY`
   and `DEVRESOLVE_DEMO_ISSUE_STATUS` to the team's accepted values if needed
   (defaults: `BUG`, `OPEN`). The job status does not overwrite the team's issue workflow.
5. Install Bob Shell 2 on Node.js 24+, restart `npm run dev`, then open `/issues/new`.
   `/bob-test` remains an alias using the same form. See [bob-agent-poc.md](bob-agent-poc.md).

The SQL assumes `ProjekId` and `ReporterId` remain varchar as shown in the screenshots.
If the team has changed these types or added required columns, adapt the function
before running it. Existing project/issue RLS policies remain unchanged; review them
with the team. The new jobs table and RPC permit only service-role access.

## Verify

- Dropdown projects come from `GET /api/projects`; there is no static fallback.
- Submit creates a real issue and job before cloning. A missing Bob key/executable
  produces a persisted `FAILED` result.
- Bob runs synchronously; current stages stored are QUEUED, CLONING, INVESTIGATING,
  and the final status. No simulated FIXING/VALIDATING or realtime events.
- On completion the URL becomes `/issues/new?job=<uuid>` (or `/bob-test?job=<uuid>` on the alias). Refresh restores the result
  from `GET /api/bob/jobs/<uuid>` rather than browser memory.
- Check issue title, ProjekId, expected_behavior, screenshot_ref, and bob_jobs.result
  in Table Editor. screenshot_ref is a reference only, not a file upload.
- A failed result write is displayed explicitly; do not refresh until you save
  that response. There is no durable worker or automatic retry for interrupted jobs.

Example request (replace projectId with an existing database ID):

```json
{
  "projectId": "1",
  "issue": {
    "title": "Discount total is incorrect",
    "description": "A 20% discount leaves a price of 100000 unchanged.",
    "expectedBehavior": "The total should be 80000.",
    "screenshotRef": "uploads/discount.png"
  }
}
```

Older callers can send `project.id` instead of `projectId`, but the server always
reads the repository and branch from Supabase. Client-supplied issueId, repository,
name, and branch are ignored. IDs are returned as strings to preserve bigint values.

## Limits

Run this without authentication only as a trusted local demo. Service-role keys
stay server-side, but the Next.js demo endpoints have no user access controls yet.
Do not expose them publicly before adding authentication/authorization.
Bob Shell must be installed on the server machine; ordinary serverless hosting
does not provide it or a durable long-running worker automatically.
The existing runner deletes its temporary workspace after execution. Saving a
branch name/result in Supabase does not publish the branch or preserve the fix;
GitHub push/PR or patch export is still a separate task.

No SQL is applied automatically and no Bob invocation is performed by build/tests.
Keep `AGENTS.md` and `bob_sessions`, and save evidence as
`member05_task02_supabase_bob_integration_summary.png` after a successful demo.
