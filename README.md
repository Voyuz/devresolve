# IBM Hackathon GitHub Project Template

This GitHub project template is for IBM Hackathon projects. It includes pre-configured security files to help prevent accidental credential commits and potential account suspension during the hackathon.

Repository foundation for the IBM Bob 2.0 Hackathon. The Bob agent PoC at `/issues/new`
uses Supabase project data, a temporary GitHub clone, and Bob Shell 2. See
[the PoC guide](docs/bob-agent-poc.md) for setup and the demo-login-app test.
Unrelated dashboard, authentication, and GitHub PR/merge features are not implemented.

## 🚀 Quick Start

1. **Use this template to create your project:**
   - Click "Use this template" button above and select "Create a new repository"
   - Name your repository
   - Click "Create repository"

Requires Node.js 24 or newer and npm when running the Bob Shell 2 PoC.

2. **Clone your new repository:**

   ```bash
   git clone https://github.com/HACKATHON-ORG/your-repo-name.git
   cd your-repo-name
   ```

3. **Set up environment variables:**

   ```bash
   # Copy the example file
   cp .env.example .env

The application builds without Supabase credentials. To run the PoC, fill your
ignored `.env.local` using the variable names in `.env.example`; do not overwrite
an existing local file. Never expose `SUPABASE_SERVICE_ROLE_KEY` to browser code or
commit environment files. `npm run test:bob` runs local contract tests with a fake
Bob process, without using an IBM API key or starting a paid agent task.

   # Edit .env with your actual credentials
   # Use your preferred editor (nano, vim, code, etc.)
   nano .env
   ```

4. **Verify .gitignore is working:**

   ```bash
   # This should NOT show .env file
   git status

   # This should confirm .env is ignored
   git check-ignore -v .env
   ```

5. **Start developing!**

## 🔒 Security Features

This template includes:

- **`.gitignore`** - Prevents committing credentials and live session files
- **`.bobignore`** - Prevents AI assistants from logging credentials
- **`.env.example`** - Template for your environment variables

## 📋 Before Every Commit

Always run this checklist:

- [ ] Reviewed `git diff` for sensitive data
- [ ] No hardcoded API keys or passwords
- [ ] `.env` file is NOT in staged changes
- [ ] No files with "credential" or "secret" in name
- [ ] Used environment variables for all credentials

## 🆘 Need Help?

- Read [SECURITY.md](SECURITY.MD) for detailed guidelines
- Contact hackathon support through mentor channel
- Ask in the hackathon Slack workspace

---

**Remember:** Security is everyone's responsibility. When in doubt, ask for help!

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
