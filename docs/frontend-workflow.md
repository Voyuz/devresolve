# Frontend and Bob workflow

The frontend from `origin/main` is integrated with the existing server-side Supabase, Bob Shell, and GitHub review code.

1. `/projects` loads the team's projects from Supabase.
2. `/issues/new` saves a report without starting Bob. Expected behavior is stored separately; actual behavior, reproduction steps, and logs are included in the description. Attachments store metadata only, not file contents.
3. `/issues` and `/dashboard` show saved reports and the latest job status.
4. `/developer/triage` lists reports. Assign to Bob opens `/developer/bob-tasks?issue=ID`; the developer then starts investigation explicitly.
5. Bob uses the existing report ID, streams activity, validates changes, and saves the review artifact.
6. `/developer/bob-tasks?job=UUID` opens a saved result and its real patch. Approve/reject uses the existing reviewer access code. Approval publishes a fix branch; merging that branch into the base branch remains a separate GitHub action.

The server detects both the original mixed-case issue columns and the team's newer `project_id`, `reporter_id`, `category_issues`, and status enum schema. Reporter submission and developer execution work with either schema. On the newer schema, attachment metadata is appended to the description because `screenshot_ref` may not exist.

Run `docs/supabase-review.sql` if it has not already been applied. The updated `docs/supabase-bob.sql` also supports both schemas in its atomic issue/job creation function. Re-run it before using the legacy direct-submit `/bob-test` flow with the newer issue schema. SQL is supplied for manual review and execution; this merge does not execute database migrations.

The current application is a local shared-team demo. Switching reporter/developer mode is navigation, not authorization. Reports are not filtered to an authenticated user. Supabase service keys remain server-only; review publishing retains its localhost, same-origin, and reviewer-code checks. Authentication and project membership controls are required before hosting publicly.

Human assignment and priority editing are disabled until persistence is implemented. Priority is shown as unclassified; project health is not monitored. Published fixes are not automatically counted as resolved, because publication does not prove a merge. Existing issue statuses of RESOLVED/CLOSED are respected.

`/bob-test` remains available for the original direct submit/investigate/review flow. Existing API clients can still send `projectId` and `issue` to `/api/bob/resolve`; developer triage sends only `issueId`, and the server reloads the saved issue and repository mapping.
