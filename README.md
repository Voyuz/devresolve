# DevResolve AI

Repository foundation for the IBM Bob 2.0 Hackathon. The Bob agent PoC at `/issues/new`
uses Supabase project data, a temporary GitHub clone, and Bob Shell 2. See
[the PoC guide](docs/bob-agent-poc.md) for setup and the demo-login-app test.
Unrelated dashboard, authentication, and GitHub PR/merge features are not implemented.

## Local development

Requires Node.js 24 or newer and npm when running the Bob Shell 2 PoC.

```sh
npm install
npm run dev
```

Open http://localhost:3000. On Windows PowerShell, use `npm.cmd` if script execution policy blocks `npm`.

```sh
npm run build
npm run typecheck
npm run start
```

The application builds without Supabase credentials. To run the PoC, fill your
ignored `.env.local` using the variable names in `.env.example`; do not overwrite
an existing local file. Never expose `SUPABASE_SERVICE_ROLE_KEY` to browser code or
commit environment files. `npm run test:bob` runs local contract tests with a fake
Bob process, without using an IBM API key or starting a paid agent task.

## Structure

- `app`: App Router pages and reserved API routes (currently return HTTP 501).
- `components/ui`: shadcn components.
- `components/layout`: shared placeholder layout.
- `lib/supabase`, `lib/bob`, `lib/github`: reserved integration folders.
- `types`: reserved project types.
- `docs`: project documentation.
- `AGENTS.md`: IBM Bob and coding-agent project guidance.
- `bob_sessions`: required hackathon evidence; use `memberXX_taskXX_description_summary.png`.

The routes `/`, `/dashboard`, `/issues`, `/issues/new`, `/issues/[id]`, and `/projects` are minimal placeholders. The home page includes light, dark, and system theme controls.

## Repository hygiene

Successful Bob jobs now retain a review diff. Follow [GitHub approval setup](docs/github-review.md)
to configure the review migration, server token and reviewer code. Approve creates
a commit on a separate fix branch; Reject does not write to GitHub.
Run `npm run test:review` for isolated review/publishing checks without GitHub writes.

`node_modules`, `.next`, and local environment files must remain untracked. Previously tracked dependencies and `.env.local` were removed from the index only; local files and Git history were preserved. If real credentials were committed previously, rotate them in the relevant service.

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
