# Combined Windows setup

Open `/developer/setup` while signed in as a developer on `localhost`. Review the explanation, tick the consent checkbox, and choose **Approve and install Node + Bob**. This runs only on the local server computer. Remote hosting and reporter accounts cannot install software through this endpoint.

Setup preserves compatible existing tools. If Node is missing or older than 24, it downloads a Node 24 Windows archive from `nodejs.org` and checks the SHA256 checksum. It then installs the Bob Shell 2 package using the official IBM release/version/checksum endpoints documented by the [IBM installer](https://bob.ibm.com/download/bobshell.ps1). Downloads and tools are stored under `.local-tools/`; no system administrator installation or global Node replacement is required.

The runner discovers `.local-tools/bob/node_modules/bobshell/dist/bob.js` automatically and uses the private Node runtime when present. `BOB_SHELL_EXECUTABLE` remains an optional override. An invalid explicit override must be corrected or cleared manually.

## First setup without Node

Without Node, the Next.js website cannot start. From the repository folder in Windows PowerShell, the same combined installer can run before the app:

```powershell
# Review scripts/setup-bob.ps1 first. This command explicitly approves installation.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\setup-bob.ps1 -Approve
$env:PATH = "$PWD\.local-tools\node;$PWD\.local-tools\bob;$env:PATH"
npm.cmd install
npm.cmd run dev
```

The command permits this reviewed script only in its PowerShell child process; it does not change machine-wide execution policy. If your organization's policy still blocks it, follow your administrator's instructions. The PATH line makes the private runtime available in your current terminal; a new terminal may not retain that PATH. After setup, load the private runtime when needed:

```powershell
$env:PATH = "$PWD\.local-tools\node;$PWD\.local-tools\bob;$env:PATH"
npm.cmd run dev
```

## Credentials and errors

Set `BOB_API_KEY` (or supported `BOBSHELL_API_KEY`) in `.env.local`. Setup does not create an IBM key, accept IBM account agreements, or execute a model task. Do not enter a key into installer logs. The API installer child receives only necessary OS/proxy variables; Supabase, GitHub, session, and Bob credentials are excluded.

Progress shows the current stage. Network, checksum, npm, permission, or verification failure produces a failed result instead of claiming readiness. Inspect `.local-tools/npm-install.log` locally if npm failed. Never share the raw log without checking it for sensitive information. Review the failure, correct the cause, and approve a retry. Existing compatible tools are skipped on retry. An exclusive filesystem lock prevents simultaneous installation across server processes. The web installer stops after 15 minutes.

Restart DevResolve after upgrading the Node runtime used by the server. The status endpoint can cache Bob readiness for up to 60 seconds. Installation files are not application artifacts to commit. macOS/Linux require the [official IBM setup](https://bob.ibm.com/docs/shell/getting-started/install-and-setup); the combined installer currently supports Windows x64 and ARM64.
