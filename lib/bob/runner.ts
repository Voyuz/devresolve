import { spawn } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import { delimiter, dirname, extname, isAbsolute, join, resolve } from "node:path";
import { homedir } from "node:os";

export interface BobLaunch { command: string; prefix: string[] }
export interface BobRunOptions {
  workspacePath: string;
  prompt: string;
  timeoutMs?: number;
  idleTimeoutMs?: number;
  launch?: BobLaunch;
  onLine?: (line: string) => void;
}
export interface BobRunResult { stdout: string; stderr: string; exitCode: number; bobTaskId?: string }
export const BOB_RUN_ARGS = ["run", "--mode", "agent", "--format", "stream-json", "--trust", "--accept-license", "--disable-mcp", "--disable-subagents", "--log-level", "error", "--max-turns", "40"];

export function getBobApiKey() {
  // Current local configuration uses BOBSHELL_API_KEY; Bob Shell 2 uses BOB_API_KEY.
  const key = process.env.BOB_API_KEY || process.env.BOBSHELL_API_KEY;
  if (!key) throw new Error("Configure BOB_API_KEY (or the existing BOBSHELL_API_KEY) on the server.");
  return key;
}

export function bobEnvironment(): NodeJS.ProcessEnv {
  // A Next dev server sets NODE_ENV=development. Do not leak that into builds
  // of the target repository: Next build expects a production environment.
  const env: NodeJS.ProcessEnv = { NODE_ENV: "production" };
  for (const [name, value] of Object.entries(process.env)) {
    if (/^(path|home|userprofile|systemroot|windir|temp|tmp|appdata|localappdata|programfiles(?:\(x86\))?|pathext|node_extra_ca_certs|https?_proxy|no_proxy|all_proxy)$/i.test(name)) env[name] = value;
  }
  // Never pass Supabase/GitHub/application secrets into the cloned repository process.
  env.BOB_API_KEY = getBobApiKey();
  return env;
}

async function resolveLaunch(): Promise<BobLaunch> {
  const configured = process.env.BOB_SHELL_EXECUTABLE?.trim();
  const candidates: string[] = [];
  if (configured) {
    if (!isAbsolute(configured)) throw new Error("BOB_SHELL_EXECUTABLE must be an absolute path to Bob Shell.");
    candidates.push(configured);
  } else {
    const suffixes = process.platform === "win32" ? [".exe", ".cmd", ".bat", ""] : [""];
    const directories = (process.env.PATH || "").split(delimiter).filter(Boolean);
    // npm's user bin may be missing from a server process's older PATH.
    // Resolve per-machine locations; no user name or drive is hardcoded.
    if (process.platform === "win32" && process.env.APPDATA) directories.push(join(process.env.APPDATA, "npm"));
    directories.push(dirname(process.execPath), join(homedir(), ".local", "bin"));
    for (const directory of [...new Set(directories)]) {
      for (const suffix of suffixes) candidates.push(join(directory, `bob${suffix}`));
    }
    if (process.platform === "win32" && process.env.APPDATA) candidates.push(join(process.env.APPDATA, "npm", "node_modules", "bobshell", "dist", "bob.js"));
    candidates.push(join(dirname(process.execPath), "node_modules", "bobshell", "dist", "bob.js"));
    if (process.platform !== "win32") candidates.push(resolve(dirname(process.execPath), "..", "lib", "node_modules", "bobshell", "dist", "bob.js"));
  }
  for (const candidate of candidates) {
    try { await access(candidate, constants.F_OK); } catch { continue; }
    const extension = extname(candidate).toLowerCase();
    if ([".js", ".mjs", ".cjs"].includes(extension)) return { command: process.execPath, prefix: [candidate] };
    if (extension === ".cmd" || extension === ".bat") {
      // Resolve an npm Node shim without cmd.exe or interpolating shell arguments.
      const shim = await readFile(candidate, "utf8");
      const script = shim.match(/"%dp0%[\\/]([^"\r\n]+\.(?:[cm]?js))"/i)?.[1];
      if (!script) throw new Error("Bob's Windows launcher is not a supported Node shim. Set BOB_SHELL_EXECUTABLE to its .exe or JavaScript entry point.");
      const entry = resolve(dirname(candidate), script);
      await access(entry, constants.F_OK);
      return { command: process.execPath, prefix: [entry] };
    }
    return { command: candidate, prefix: [] };
  }
  throw new Error("Bob Shell executable not found. Install Bob Shell 2, restart the server to refresh PATH, or set BOB_SHELL_EXECUTABLE.");
}

/** Check installed capabilities without starting a model task or exposing raw output. */
export async function checkBobAvailability(): Promise<BobLaunch> {
  getBobApiKey();
  if (Number(process.versions.node.split(".")[0]) < 24) throw new Error("Bob Shell 2 requires Node.js 24 or later.");
  const launch = await resolveLaunch();
  const help = await capture(launch, ["run", "--help"], process.cwd(), undefined, 15000);
  if (help.exitCode !== 0 || !/--format\b/.test(help.stdout + help.stderr) || !/--mode\b/.test(help.stdout + help.stderr)) {
    throw new Error("Installed Bob Shell does not support the Bob Shell 2 run/stream-json interface. Upgrade Bob Shell or point BOB_SHELL_EXECUTABLE to Bob Shell 2.");
  }
  return launch;
}

export async function runBob(options: BobRunOptions): Promise<BobRunResult> {
  const launch = options.launch || await checkBobAvailability();
  const team = process.env.BOB_TEAM_ID;
  if (team && !/^[A-Za-z0-9_-]{1,150}$/.test(team)) throw new Error("Invalid BOB_TEAM_ID.");
  const args = [...BOB_RUN_ARGS, ...(team ? ["--team-id", team] : [])];
  return capture(launch, args, options.workspacePath, options.prompt, options.timeoutMs ?? 600000, options.onLine, options.idleTimeoutMs ?? 180000);
}

/** Single-turn, tool-less classification: Bob cannot read, edit, or execute anything. */
export const BOB_TRIAGE_ARGS = ["run", "--mode", "agent", "--format", "json", "--trust", "--accept-license", "--disable-mcp", "--disable-subagents",
  "--disable-tool-groups", "read,edit,execute,mcp,skill,todo,subagent", "--max-turns", "1", "--max-cost", "0.1", "--log-level", "error"];

export async function runBobTriage(options: { workspacePath: string; prompt: string; timeoutMs?: number; launch?: BobLaunch }): Promise<BobRunResult> {
  const launch = options.launch || await checkBobAvailability();
  const team = process.env.BOB_TEAM_ID;
  if (team && !/^[A-Za-z0-9_-]{1,150}$/.test(team)) throw new Error("Invalid BOB_TEAM_ID.");
  const args = [...BOB_TRIAGE_ARGS, ...(team ? ["--team-id", team] : [])];
  return capture(launch, args, options.workspacePath, options.prompt, options.timeoutMs ?? 90000);
}

function capture(launch: BobLaunch, args: string[], cwd: string, input: string | undefined,
  timeoutMs: number, onLine?: (line: string) => void, idleTimeoutMs?: number): Promise<BobRunResult> {
  return new Promise((resolveResult, reject) => {
    const child = spawn(launch.command, [...launch.prefix, ...args], {
      cwd, env: bobEnvironment(), stdio: ["pipe", "pipe", "pipe"], windowsHide: true, shell: false,
    });
    let stdout = "", stderr = "", pending = "";
    let failure: Error | undefined;
    let totalBytes = 0;
    const stop = (error: Error) => {
      if (failure) return;
      failure = error;
      if (process.platform === "win32" && child.pid) {
        const kill = spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" });
        kill.on("error", () => child.kill());
        kill.unref();
        // Some restricted Windows sessions block taskkill. Still stop our child.
        const fallback = setTimeout(() => child.kill("SIGTERM"), 500);
        fallback.unref();
      } else child.kill("SIGTERM");
    };
    const timer = setTimeout(() => stop(new Error(`Bob Shell timed out after ${Math.round(timeoutMs / 1000)} seconds.`)), timeoutMs);
    let idleTimer: ReturnType<typeof setTimeout> | undefined;
    const resetIdle = () => {
      clearTimeout(idleTimer);
      if (idleTimeoutMs) idleTimer = setTimeout(() => stop(new Error(`Bob Shell produced no output for ${Math.round(idleTimeoutMs / 1000)} seconds. The session may be stalled; inspect Bob Shell before retrying.`)), idleTimeoutMs);
    };
    resetIdle();
    const emit = (line: string) => {
      try { onLine?.(line); } catch { stop(new Error("Unable to process Bob activity.")); }
    };
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      resetIdle();
      totalBytes += Buffer.byteLength(chunk);
      if (totalBytes > 16 * 1024 * 1024) return stop(new Error("Bob output exceeded the 16 MB capture limit."));
      stdout += chunk; pending += chunk;
      let newline;
      while ((newline = pending.indexOf("\n")) !== -1) {
        emit(pending.slice(0, newline)); pending = pending.slice(newline + 1);
      }
    });
    child.stderr.on("data", (chunk: string) => {
      resetIdle();
      totalBytes += Buffer.byteLength(chunk);
      if (totalBytes > 16 * 1024 * 1024) return stop(new Error("Bob output exceeded the 16 MB capture limit."));
      stderr += chunk;
    });
    child.stdin.on("error", (error: NodeJS.ErrnoException) => {
      // Bob can exit before consuming stdin; close/exit code determines the result.
      if (error.code !== "EPIPE") stop(new Error("Cannot send the task prompt to Bob Shell."));
    });
    child.on("error", () => {
      clearTimeout(timer);
      clearTimeout(idleTimer);
      reject(new Error("Cannot start Bob Shell. Check its executable path and local installation."));
    });
    child.on("close", code => {
      clearTimeout(timer);
      clearTimeout(idleTimer);
      if (pending) emit(pending);
      if (failure) { reject(failure); return; }
      let bobTaskId: string | undefined;
      for (const line of stdout.split(/\r?\n/)) {
        try {
          const event = JSON.parse(line);
          if (event.type === "result" && typeof event.stats?.task_id === "string" && /^[A-Za-z0-9_-]{1,150}$/.test(event.stats.task_id)) bobTaskId = event.stats.task_id;
        } catch { /* Non-JSON diagnostics are not exposed as activity. */ }
      }
      resolveResult({ stdout, stderr, exitCode: code ?? 1, bobTaskId });
    });
    child.stdin.end(input || "");
  });
}
