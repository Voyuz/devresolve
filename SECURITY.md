# DevResolve security setup

Based on the [official IBM Hackathon template](https://github.com/watsonxhackathon/ibm-hackathon-template),
especially its [.gitignore](https://github.com/watsonxhackathon/ibm-hackathon-template/blob/main/.gitignore),
[.bobignore](https://github.com/watsonxhackathon/ibm-hackathon-template/blob/main/.bobignore),
and [security guidance](https://github.com/watsonxhackathon/ibm-hackathon-template/blob/main/SECURITY.MD).

## What was adopted

| File | DevResolve adaptation |
| --- | --- |
| `.gitignore` | Preserve Next.js exclusions; add credential/key files, private local config, live sessions, caches, logs, backups. Keep `.env.example` and required `bob_sessions` exports available. |
| `.bobignore` | Exclude real environment files, credentials, keys, local sensitive config, generated output and live sessions. Allow the reviewed placeholder template and project guidance. |
| `.env.example` | Use empty values for this project's variables rather than template-specific IBM Cloud credentials. Document reserved variables explicitly. |
| `README.md` | Add the template's pre-commit checks without replacing project documentation. |

Patterns for sensitive config target local/secret files rather than the template's broad
`*config.json` pattern, which would hide legitimate project configuration such as
`tsconfig.json`. Credential filename patterns are safeguards, not a guarantee of detection.
Do not name a credential file innocuously and assume these rules protect it.

## Local environment

Create `.env.local` from `.env.example` only if no local file exists. Add values manually;
never overwrite a teammate's existing local configuration or paste values into AI prompts.

- The Bob Shell 2 integration prefers `BOB_API_KEY` and accepts the existing
  `BOBSHELL_API_KEY` as a compatibility fallback. It passes the chosen key as
  `BOB_API_KEY` to the child process, without changing your local credential file.
- `BOB_SHELL_EXECUTABLE` can point to the installed Bob executable/JS entry;
  `BOB_TEAM_ID` is optional team context. Neither belongs in browser configuration.
- `GITHUB_TOKEN` is reserved for future authenticated GitHub integration and is not used today.
- Supabase uses `NEXT_PUBLIC_SUPABASE_URL` and server-only `SUPABASE_SERVICE_ROLE_KEY`.
  The public anon key is reserved for browser/auth integration. Public configuration is
  visible to browser users and must never contain a private/service-role key.
- Optional `DEVRESOLVE_DEMO_*` fields are nonsecret demo configuration. Their defaults
  are documented as comments in `.env.example`; the example assignments stay empty.

## Before committing

- Review `git diff` and `git diff --cached` locally. Do not paste an unreviewed diff into chat.
- Verify `git check-ignore -v .env .env.local` reports ignore rules.
- Check `git diff --cached --name-only` for environment, credential, key, and session files.
- Never hardcode credentials; use environment variables and server-only modules.
- Confirm no real credentials appear in `.env.example`, comments, prompts, or logs.
- Review each screenshot in `bob_sessions` for keys, tokens, passwords and terminal output.
  Preserve the required folder and `memberXX_taskXX_description_summary.png` convention.
- Run `npm run build` before sharing configuration changes.

Ignore files do not remove tracked files, erase Git history, redact terminal output,
or inspect screenshots. An AI ignore rule does not replace careful prompt handling.
Live-session exclusions deliberately avoid ignoring all of `bob_sessions`, `.bob`,
or `.codex`, so submission evidence and project instructions remain available.

## If a credential was exposed

1. Revoke/rotate it in the issuing service (IBM Bob, Supabase, or GitHub) immediately.
2. Replace the value manually in your ignored `.env.local` and restart local processes.
3. Remove credentials from code and shareable artifacts; keep only environment references.
4. Review old screenshots, AI sessions, attachments, build logs, and published commits.
5. If it reached Git history, coordinate remediation with the team and hackathon mentor.
   Adding ignore rules does not remove history. Do not rewrite history or force-push
   without an explicitly agreed team procedure.

The Bob key previously pasted into `.env.example` should be treated as exposed even
though that example value has been cleared. A matching value in `.env.local` is expected
local configuration, not proof that the old key has been rotated.

These changes do not add authentication or change application logic. The existing
unauthenticated Bob demo endpoints remain suitable only for a trusted local demo;
review access controls before exposing them publicly.
