# DevResolve AI

> DevResolve turns a bug report into a validated fix by orchestrating the developer workflow and using
> IBM Bob as the engineering agent that investigates, fixes, and tests the real codebase.

Built for the IBM Bob 2.0 Hackathon. DevResolve is not a coding chatbot: every bug has a lifecycle, IBM Bob
works on a real clone of the project repository, validation is mandatory, and a human always makes the final call.

```
Report → AI Triage → Repository mapping → Bob investigates → Fix → Test → (retry) → Human review → Resolved
                                                                   ↑                      │
                                                                   └── Request changes ───┘
```

## Features

| Area | Route | What it does |
|---|---|---|
| Sign in / register | `/auth/login`, `/auth/register` | Accounts from the `profiles` table; developer pages require role `developer` |
| Dashboard | `/dashboard` | Open, in-progress, resolved, and critical counts per project |
| Projects | `/projects` | Your projects (developers see all) with live GitHub status; developers **Add project** for a chosen user (checked against GitHub) |
| Report an issue | `/issues/new` | Title, description, expected/actual behavior, error log; auto-triaged on submit |
| My Issues | `/issues` | Reporter view of every issue and its current stage |
| Issue detail | `/issues/[id]` | Full report, triage, workflow progress, and every Bob round |
| Developer overview | `/developer` | Project health and recent Bob activity |
| Issue Inbox (triage) | `/developer/triage` | **Triage with Bob**, manual severity/priority override, assign to Bob |
| Bob Resolution | `/developer/bob-tasks` | Run Bob, watch live activity, review the patch, Approve / Request changes / Reject |

## How IBM Bob is used

**1. AI triage.** Clicking *Triage with Bob* runs Bob Shell for a single turn with every tool group disabled,
in an empty directory, with a cost cap (about $0.006 and 8 seconds per issue in testing). Bob returns category,
severity, priority, and a one-sentence rationale. Only values from the allowed enums are accepted. If Bob is
unavailable, keyword rules classify the issue instead, and new reports are always rule-triaged when created.

**2. Resolution.** *Assign to Bob* clones the project repository into a temporary directory, pre-installs its
dependencies, and creates a `devresolve/issue-<id>` branch. Bob then runs in agent mode with a structured task:
read `AGENTS.md`, find the root cause, make the smallest safe fix, run tests and the build, and revise until they
pass. It must stop and request human intervention for security-sensitive or ambiguous decisions. Activity streams
to the UI. A result becomes **Ready for review** only when Bob's summary and the observed test/build results agree.

**3. Human review.** The reviewer sees the root cause, changed files, the real diff, and validation results:

- **Approve** publishes the fix as a commit on a separate GitHub branch. Nothing is merged automatically.
- **Request changes** stores the reviewer's feedback. *Run Bob with this feedback* starts a new round in which
  Bob receives the feedback and the previous patch.
- **Reject** leaves GitHub unchanged.

**4. Iterations.** Each review shows its round number and the full history of rounds for the issue, including
reviewer feedback, plus how many times Bob ran tests and the build inside the run. This makes Bob's
self-resolution loop visible.

## Getting started

### Prerequisites

- Node.js **24+** and npm, with Git on the PATH.
- A Supabase project.
- To run Bob: [Bob Shell 2](https://bob.ibm.com/docs/shell/getting-started/install-and-setup) installed
  (`bob run --help` must work) and a Bob API key with **Inference** scope from the Bob web portal.
- To publish approved fixes: a GitHub fine-grained token with **Contents: Read and write** on the target repository.

### Install and configure

```sh
npm install
```

Create `.env.local` from [`.env.example`](.env.example). Never commit it.

| Variable | Needed for |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase connection |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side database access (server only; never prefix with `NEXT_PUBLIC_`) |
| `BOB_API_KEY` (or legacy `BOBSHELL_API_KEY`) | Bob triage and resolution |
| `BOB_TEAM_ID` | Only for Bob keys of type *general* |
| `BOB_SHELL_EXECUTABLE` | Optional absolute path; leave blank for automatic discovery |
| `GITHUB_TOKEN` | Approve (publishing fix branches) |
| `DEVRESOLVE_REVIEW_TOKEN` | Reviewer access code typed in the review panel |
| `DEVRESOLVE_SESSION_SECRET` | Optional (32+ chars) login-session signing key; derived from the service key when blank |

### Database

The app uses the tables `projects`, `issues`, `profiles`, `bob_jobs`, and `bob_sessions`. After creating the base
schema, review and run in the Supabase SQL Editor:

1. [`docs/supabase-bob.sql`](docs/supabase-bob.sql): `bob_jobs`, the default branch column, and the issue/job function.
2. [`docs/supabase-review.sql`](docs/supabase-review.sql): review columns (`artifact`, `review_status`, …).

Then add a project row with `NameProjek`, `RepoUrl` (plain public GitHub HTTPS URL), and `DefaultBranch`.
Details: [docs/supabase-bob.md](docs/supabase-bob.md), [docs/github-review.md](docs/github-review.md).

### Run

```sh
npm run dev
```

Open http://localhost:3000. On Windows PowerShell, use `npm.cmd` if the script execution policy blocks `npm`.
Restart the dev server after changing `.env.local`.

## Demo

A full walkthrough is in [docs/demo-flow.md](docs/demo-flow.md). The demo repository needs a branch that still
contains the bug. Point the project's `DefaultBranch` at it so that every run has something to fix.

## Testing

```sh
npm run typecheck
npm run lint
npm run build
npm run test:bob        # request validation, prompt, stream parser, runner (fake Bob process)
npm run test:review     # artifact capture, GitHub publishing, review decisions (mocked GitHub)
npm run test:triage     # keyword rules and Bob answer validation
npm run test:workspace  # issue persistence against a mocked Supabase client
npm run test:auth       # session signing, credential checks, proxy access rules
```

The test suites never call IBM Bob, GitHub, or Supabase, and never spend Bobcoins.

## Architecture

- `app/(main)`: reporter and developer pages (App Router, client components).
- `app/api`: route handlers for issues, triage, projects, the workspace snapshot, Bob runs, and reviews.
- `lib/bob`: the Bob Shell runner, task prompt, stream parser, temporary workspace, and review artifact capture.
- `lib/triage`: Bob triage and keyword-rule fallback.
- `lib/supabase`: server-side data access (service role); `client.ts` and `server-auth.ts` are ready for Supabase Auth.
- `lib/github`: publishing approved artifacts to a fix branch.
- `types`: shared types matching the database schema.

More detail: [docs/architecture.md](docs/architecture.md).

## Limitations

- **Local demo.** Bob runs as a local process for up to 10 minutes per round, so the resolution flow must run on
  a machine with Bob Shell installed. It cannot run on serverless hosting such as Vercel.
- **Simple accounts.** Sign-in uses the team's `profiles` table (`NamaUser`, `SandiUser`, `role`) with a signed,
  HttpOnly session cookie; `proxy.ts` requires a session everywhere and role `developer` for developer pages and
  actions (running Bob, triage, reviews). New registrations get role `user`; grant `developer` in Supabase.
  By team decision, passwords are stored as entered (not hashed), matching the existing rows. Do not reuse real
  passwords, and move to hashed passwords or Supabase Auth before hosting publicly. Each project has one owner
  (`projects.profil_id`): reporters see and report on their own projects only; developers see every project. Review publishing is also restricted to localhost and the
  reviewer access code.
- Approval publishes a branch; merging it is a normal GitHub pull request step.
- Attachments store file metadata only.

## Hackathon artifacts

- [`AGENTS.md`](AGENTS.md): project guidance for IBM Bob and other coding agents.
- [`bob_sessions/`](bob_sessions): IBM Bob Task Session Summary screenshots, named
  `memberXX_taskXX_description_summary.png`.

## Security before every commit

Adapted from the [official IBM Hackathon template](https://github.com/watsonxhackathon/ibm-hackathon-template).

- Review `git diff` and `git diff --cached` locally for sensitive data before committing.
- Run `git check-ignore -v .env .env.local` and verify neither file appears in staged changes.
- Never hardcode credentials or include them in comments, screenshots, prompts, or logs.
- Use environment variables; keep Bob, GitHub, and Supabase service-role keys server-side.
- Do not commit credential files, private keys, local session files, or caches.
- Keep `.env.example` values empty. Keep `AGENTS.md` and reviewed `bob_sessions` evidence in the repository.

See [SECURITY.md](SECURITY.md) for setup, key names, and exposure response. `.gitignore`
does not remove previously tracked files, and `.bobignore` does not scrub old logs or screenshots.
