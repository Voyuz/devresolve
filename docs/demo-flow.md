# Demo flow

A 5–7 minute walkthrough of the full DevResolve workflow, following the scenario in the project brief.

## Before the demo

- `.env.local` contains the Supabase keys, `BOB_API_KEY`, and `GITHUB_TOKEN`
  (see the README). Restart `npm run dev` after editing it.
- `bob run --help` works on the demo machine (Bob Shell 2, Node.js 24+).
- The demo project's `DefaultBranch` points to a branch that **still contains the bug** (for example `demo-bug`).
  If the branch already has the fix, Bob correctly reports that no change is needed and there is nothing to review.
- Warm the npm cache once (run one Bob job beforehand). The first dependency install can take several minutes.
- Keep a Bob Task Session Summary screenshot for `bob_sessions/`.

## Script

1. **Report (user).** Open `/issues/new`, pick the project, and use a demo case or type the bug
   (for the login demo: *email matching should ignore letter casing*). Fill in expected and actual behavior.
   Submit. The issue is auto-triaged by keyword rules immediately.
2. **Track (user).** Open `/issues`, then *View full details*. The workflow bar shows *Reported → Triaged*.
3. **AI triage (developer).** Open `/developer/triage` with a `developer` account. Signed in as a developer, you
   can show the whole flow from one login using the **Reporter view / Developer view** button. Click **Triage with Bob**.
   Bob returns category, severity, priority, and a rationale in seconds. Adjust with **Set Priority** if needed.
4. **Assign to Bob.** Click **Assign to Bob AI**, then **Submit to Bob**. Narrate the live activity:
   dependencies installed, files read, root cause, fix, tests, build.
5. **Human review.** When the result is *READY_FOR_REVIEW*, show the root cause, changed files, the real diff,
   validation, and the **Iterations** panel.
6. **Request changes.** Ask for an improvement, for example
   *"Also trim whitespace from the email and add a test for it"*, then click **Request changes** and
   **Run Bob with this feedback**. Round 2 addresses the feedback.
7. **Approve.** Approve round 2. DevResolve publishes a commit on a `devresolve/issue-<id>-<job>` branch.
   Open the GitHub link. The issue now shows **Resolved** in `/issues/[id]` and on the dashboard.

## Fallbacks

- **Bob Shell missing or no API key:** triage falls back to keyword rules (the UI says so). Show a saved job from
  `/developer/bob-tasks` instead of running a new one.
- **Slow install:** the first run can spend minutes on `npm ci`. Start the Bob run before narrating the triage step.
