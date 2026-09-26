# Review and publish a Bob fix

Run the whole `docs/supabase-review.sql` in Supabase SQL Editor after the existing
Bob migration. No existing jobs or team tables are deleted. Historical jobs have
no saved patch; submit a new issue after running the migration.

In GitHub Settings > Developer settings > Personal access tokens > Fine-grained
tokens, create a token for the owner and target demo repository, with repository
**Contents: Read and write**. The account must already have write access. Team-owned
repositories may require owner approval. Store the token only as `GITHUB_TOKEN`
in ignored `.env.local`; never send it to Bob or the browser.

`DEVRESOLVE_REVIEW_TOKEN` is a separate local reviewer access code generated in
`.env.local`. Copy it locally into the password field in Human review. It is only
sent to the local review endpoint, not stored in browser storage or sent to GitHub.
This PoC restricts reviews to the local origin. Use `npm run dev -- --hostname
127.0.0.1` for the demo. Deployment requires authenticated, authorized reviewers.

Restart Next, submit a new issue, review the root cause, validation and actual Git
diff, then select **Approve & save to GitHub** or **Reject**.

Approve creates a commit on a unique `devresolve/issue-ID-JOB` branch and displays
the GitHub commit link. It never merges into main, updates an existing branch or
force-pushes. Reject changes only the stored review decision. The approved branch
can subsequently be reviewed/merged through GitHub.

Only READY_FOR_REVIEW jobs with a saved artifact can publish. The snapshot includes
actual staged/unstaged/new text files, and the original base commit. Sensitive
files, detected keys, symlinks, submodules and deletion of hackathon artifacts are
blocked. Git subprocesses and Bob never receive the GitHub token.

Concurrent clicks use a conditional database claim. A publish failure can be
retried; an existing branch is recognized only if it belongs to the exact job and
artifact. Changed base commits require a new Bob run. If the server is terminated
while PUBLISHING, inspect the branch and job manually before resetting the review
state; never blindly reset a live publishing job.

No live GitHub write is performed by the setup tests. Configure credentials and
use the app's review button when you intend to publish the reviewed fix.
