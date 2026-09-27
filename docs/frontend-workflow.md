# Frontend and Bob workflow

The frontend from `origin/main` is integrated with the existing server-side Supabase, Bob Shell, and GitHub review code.

1. `/projects` lists the signed-in reporter's own projects (`projects.profil_id`); developers see all. *Add project* registers a GitHub repository after checking that it and its branch exist.
2. `/issues/new` saves a report without starting Bob. Expected behavior, actual behavior, and the error log are stored in their own columns; reproduction steps are appended to the description. The report is keyword-triaged on submit. Attachments store metadata only, not file contents.
3. `/issues` and `/dashboard` show saved reports and the latest job status. `/issues/[id]` shows the full report, triage, workflow progress, and every Bob round.
4. `/developer/triage` lists reports sorted by priority. *Triage with Bob* classifies category, severity, and priority (keyword rules as fallback); *Set Priority* overrides them. Assign to Bob opens `/developer/bob-tasks?issue=ID`; the developer then starts investigation explicitly.
5. Bob uses the existing report ID, streams activity, validates changes, and saves the review artifact.
6. `/developer/bob-tasks?job=UUID` opens a saved result, its real patch, and its review round history. Approve, request changes, and reject are available to signed-in developers. Approval publishes a fix branch; merging that branch into the base branch remains a separate GitHub action. Request changes saves feedback, and *Run Bob with this feedback* (`?issue=ID&previousJob=UUID`) starts the next round with that feedback and the previous patch.

The server detects both the original mixed-case issue columns and the team's newer `project_id`, `reporter_id`, `category_issues`, and status enum schema. Reporter submission and developer execution work with either schema. On the newer schema, attachment metadata is appended to the description because `screenshot_ref` may not exist.

Run `docs/supabase-review.sql` if it has not already been applied. The updated `docs/supabase-bob.sql` also supports both schemas in its atomic issue/job creation function. Re-run it before using the legacy direct-submit `/bob-test` flow with the newer issue schema. SQL is supplied for manual review and execution; this merge does not execute database migrations.

Accounts come from the `profiles` table. The role decides the area: `user` accounts see the reporter pages, and `developer` accounts see `/developer/*` (enforced by `proxy.ts` and the route handlers). Developers also get a Reporter view / Developer view button in the top bar; reporters do not. My Issues shows the signed-in reporter's own reports by default, with an "All team" option. Supabase service keys remain server-only; review publishing retains its localhost, same-origin, and reviewer-code checks. Authentication and project membership controls are required before hosting publicly.

Human assignment is disabled until persistence is implemented; project health is not monitored. An approved (published) fix counts as resolved in the UI; merging the fix branch remains a normal GitHub step. Existing issue statuses of RESOLVED/CLOSED are respected.

`/bob-test` remains available for the original direct submit/investigate/review flow. Existing API clients can still send `projectId` and `issue` to `/api/bob/resolve`; developer triage sends only `issueId`, and the server reloads the saved issue and repository mapping.
