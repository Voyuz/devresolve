import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, copyFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, relative, isAbsolute, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkBobAvailability, runBob, bobEnvironment, BOB_RUN_ARGS } from '../lib/bob/runner.ts';
let workspace;
const original = { ...process.env };
before(async () => {
  workspace = await mkdtemp(join(tmpdir(), 'devresolve-runner-test-'));
  process.env.BOB_SHELL_EXECUTABLE = fileURLToPath(new URL('./fixtures/bob-shell.mjs', import.meta.url));
  process.env.BOB_API_KEY = 'test-key-not-real';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-not-real';
  process.env.GITHUB_TOKEN = 'test-github-not-real';
});
after(async () => {
  for (const name of ['BOB_SHELL_EXECUTABLE','BOB_API_KEY','BOBSHELL_API_KEY','SUPABASE_SERVICE_ROLE_KEY','GITHUB_TOKEN','BOB_TEAM_ID']) {
    if (original[name] === undefined) delete process.env[name]; else process.env[name] = original[name];
  }
  const child = relative(resolve(tmpdir()), resolve(workspace));
  assert.ok(child && !child.startsWith('..') && !isAbsolute(child) && basename(workspace).startsWith('devresolve-runner-test-'));
  await rm(workspace, { recursive: true, force: true });
});

test('runner pipes prompts, uses cloned cwd, frames split JSON, captures task ID and scopes credentials', async () => {
  const launch = await checkBobAvailability();
  const lines = [];
  const prompt = 'Quotes " and shell text $(echo SHOULD_NOT_RUN) & remain stdin data';
  const result = await runBob({ workspacePath: workspace, prompt, launch, onLine: line => lines.push(line) });
  const diagnostics = JSON.parse(result.stderr.trim());
  assert.equal(result.exitCode, 0);
  assert.equal(result.bobTaskId, 'fixture-task-123');
  assert.equal(diagnostics.cwd, workspace);
  assert.equal(diagnostics.prompt, prompt);
  assert.equal(diagnostics.scoped, true);
  assert.deepEqual(diagnostics.args, BOB_RUN_ARGS);
  assert.equal(lines.length, 2);
  assert.equal(JSON.parse(lines[1]).type, 'result');
  assert.equal(bobEnvironment().SUPABASE_SERVICE_ROLE_KEY, undefined);
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'development';
  try { assert.equal(bobEnvironment().NODE_ENV, 'production'); }
  finally { if (previousNodeEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previousNodeEnv; }
});

test('runner captures nonzero exit without promoting the supplied success summary', async () => {
  const result = await runBob({ workspacePath: workspace, prompt: 'fixture:error' });
  assert.equal(result.exitCode, 1);
});

test('runner stops its own process on timeout', async () => {
  await assert.rejects(runBob({ workspacePath: workspace, prompt: 'fixture:timeout', timeoutMs: 250 }), /timed out/);
});

test('runner stops a silent session before the overall timeout', async () => {
  await assert.rejects(runBob({ workspacePath: workspace, prompt: 'fixture:timeout', timeoutMs: 10000, idleTimeoutMs: 250 }), /produced no output/);
});

test('missing configured executable produces a useful blocker', async () => {
  const previous = process.env.BOB_SHELL_EXECUTABLE;
  process.env.BOB_SHELL_EXECUTABLE = join(workspace, 'missing-bob.exe');
  try { await assert.rejects(checkBobAvailability(), /executable not found/); }
  finally { process.env.BOB_SHELL_EXECUTABLE = previous; }
});

test('Windows automatically discovers the current user npm installation without a configured executable or PATH entry', {skip:process.platform!=='win32'}, async()=>{
  const previous={executable:process.env.BOB_SHELL_EXECUTABLE,path:process.env.PATH,appdata:process.env.APPDATA};
  const appdata=join(workspace,'roaming');
  const bin=join(appdata,'npm');
  const entry=join(bin,'node_modules','bobshell','dist','bob.js');
  await mkdir(dirname(entry),{recursive:true});
  await copyFile(fileURLToPath(new URL('./fixtures/bob-shell.mjs',import.meta.url)),entry);
  await writeFile(join(bin,'bob.cmd'),'@echo off\nnode "%dp0%\\node_modules\\bobshell\\dist\\bob.js" %*\n');
  delete process.env.BOB_SHELL_EXECUTABLE;
  process.env.PATH='';process.env.APPDATA=appdata;
  try { const launch=await checkBobAvailability();assert.equal(launch.command,process.execPath);assert.equal(launch.prefix[0],entry); }
  finally { for(const [name,value]of [['BOB_SHELL_EXECUTABLE',previous.executable],['PATH',previous.path],['APPDATA',previous.appdata]]) {if(value===undefined)delete process.env[name];else process.env[name]=value;} }
});
