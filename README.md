# DevResolve AI

Repository foundation for the IBM Bob 2.0 Hackathon. Business features and Supabase, IBM Bob, and GitHub integrations are not implemented yet.

## Local development

Requires Node.js 22.19 or newer and npm.

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

The application builds without Supabase credentials. When integration work begins, copy `.env.example` to `.env.local` and supply your own values. Never expose `SUPABASE_SERVICE_ROLE_KEY` to browser code or commit environment files.

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

`node_modules`, `.next`, and local environment files must remain untracked. Previously tracked dependencies and `.env.local` were removed from the index only; local files and Git history were preserved. If real credentials were committed previously, rotate them in the relevant service.
