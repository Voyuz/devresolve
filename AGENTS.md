# DevResolve AI

DevResolve AI is an agentic debugging workflow for development teams.

The application turns bug reports into structured developer tasks,
uses IBM Bob to investigate and resolve issues in a project codebase,
validates the fix, and sends the result for human review.

## Main Workflow

Report Issue
→ Triage
→ Route
→ Bob Investigation
→ Fix
→ Validation
→ Human Review

## Technology Stack

- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- Lucide icons
- next-themes
- Supabase
- IBM Bob IDE

## Main Modules

- app/dashboard
- app/issues
- app/projects
- lib/supabase
- lib/bob

## Development Commands

npm install
npm run dev
npm run build
npm run typecheck
npm run start

## Engineering Rules

- Use TypeScript.
- Keep components modular.
- Never expose secrets to the client.
- Do not commit environment variables.
- Keep the issue workflow backward compatible.
- Run relevant checks before declaring a task complete.
- Preserve AGENTS.md and bob_sessions as required IBM Bob 2.0 Hackathon artifacts.
- Name Bob session screenshots memberXX_taskXX_description_summary.png.
- Keep service-role credentials on the server; never use a NEXT_PUBLIC prefix for them.
- Do not commit or push automatically, rewrite Git history, or force-push.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
