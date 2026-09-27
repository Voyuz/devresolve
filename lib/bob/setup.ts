import { spawn } from "node:child_process";
import { join } from "node:path";
import { resolveLaunch, checkBobAvailability } from "./runner.ts";

export interface SetupEvent { stage: string; message: string }
export interface SetupJob { status: "running" | "complete" | "failed"; events: SetupEvent[] }
const globalSetup = globalThis as typeof globalThis & { devresolveBobSetup?: SetupJob };

export function setupJob() { return globalSetup.devresolveBobSetup ?? null; }

export async function inspectSetup() {
  const nodeReady = Number(process.versions.node.split(".")[0]) >= 24;
  let bobInstalled = false;
  try { await resolveLaunch(); bobInstalled = true; } catch { /* Missing or invalid executable. */ }
  const apiKeyConfigured = Boolean(process.env.BOB_API_KEY || process.env.BOBSHELL_API_KEY);
  let ready = false;
  let reason: string | null = null;
  if (!setupJob() || setupJob()?.status !== "running") {
    try { await checkBobAvailability(); ready = true; }
    catch (error) { reason = error instanceof Error ? error.message : "Bob is unavailable."; }
  }
  return { nodeVersion: process.version, nodeReady, bobInstalled, apiKeyConfigured, ready, reason, supported: process.platform === "win32", job: setupJob() };
}

/** No application keys, user arguments, or arbitrary shell commands reach the installer. */
export function installerEnvironment(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { NODE_ENV: "production" };
  for (const [name, value] of Object.entries(process.env)) {
    if (/^(path|home|userprofile|systemroot|windir|temp|tmp|appdata|localappdata|programfiles(?:\(x86\))?|pathext|node_extra_ca_certs|https?_proxy|no_proxy|all_proxy)$/i.test(name)) env[name] = value;
  }
  return env;
}

export function startSetup() {
  if (process.platform !== "win32") throw new Error("Automatic setup currently supports Windows. Use the official installer on macOS/Linux.");
  if (setupJob()?.status === "running") return false;
  const job: SetupJob = { status: "running", events: [{ stage: "prepare", message: "Starting approved Node.js and Bob Shell setup." }] };
  globalSetup.devresolveBobSetup = job;
  const powershell = join(process.env.SystemRoot || "C:\\Windows", "System32", "WindowsPowerShell", "v1.0", "powershell.exe");
  const child = spawn(powershell, ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", join(process.cwd(), "scripts", "setup-bob.ps1"), "-Approve"], {
    cwd: process.cwd(), env: installerEnvironment(), shell: false, windowsHide: true, stdio: ["ignore", "pipe", "ignore"],
  });
  let pending = "";
  const failure = (message: string) => {
    job.status = "failed";
    job.events.push({ stage: "failed", message });
  };
  const timer = setTimeout(() => {
    failure("Setup exceeded 15 minutes. Check internet access and .local-tools/npm-install.log before retrying.");
    if (child.pid) {
      const kill = spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" });
      kill.on("error", () => child.kill());
      kill.unref();
      const fallback = setTimeout(() => child.kill(), 500);
      fallback.unref();
    } else child.kill();
  }, 15 * 60_000);
  child.stdout.setEncoding("utf8");
  child.stdout.on("data", (chunk: string) => {
    pending = (pending + chunk).slice(-16000);
    let newline;
    while ((newline = pending.indexOf("\n")) >= 0) {
      const line = pending.slice(0, newline).replace(/^\uFEFF/, "");
      pending = pending.slice(newline + 1);
      try {
        const event = JSON.parse(line);
        if (["prepare", "node", "bob", "complete", "failed"].includes(event.stage) && typeof event.message === "string") {
          job.events.push({ stage: event.stage, message: event.message.slice(0, 500) });
          job.events = job.events.slice(-30);
        }
      } catch { /* Never expose raw installer output. */ }
    }
  });
  child.on("error", () => { clearTimeout(timer); failure("Cannot start PowerShell. Run scripts/setup-bob.ps1 manually after reviewing it."); });
  child.on("close", code => {
    clearTimeout(timer);
    if (job.status !== "running") return;
    job.status = code === 0 && job.events.some(event => event.stage === "complete") ? "complete" : "failed";
    if (job.status === "failed" && !job.events.some(event => event.stage === "failed")) failure("Setup failed. Review docs/bob-setup.md and retry.");
  });
  return true;
}
