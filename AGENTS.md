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
