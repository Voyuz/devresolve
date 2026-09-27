import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import vm from 'node:vm';
import ts from 'typescript';
import { validateSetupRequest } from '../lib/bob/setup-request.ts';

test('setup requires local same-origin JSON and an explicit boolean approval', () => {
  const request = (url, origin, consent) => {
    const r = new Request(url, { method: 'POST', headers: { origin, 'Content-Type': 'application/json' } });
    return () => validateSetupRequest(r, { consent });
  };
  assert.throws(request('http://localhost:3000/api/bob/setup', 'https://attacker.test', true), /Same-origin/);
  assert.throws(request('https://example.com/api/bob/setup', 'https://example.com', true), /local server/);
  for (const consent of [false, undefined, 'true', 1]) assert.throws(request('http://localhost:3000/api/bob/setup', 'http://localhost:3000', consent), /Approve/);
  assert.doesNotThrow(request('http://localhost:3000/api/bob/setup', 'http://localhost:3000', true));
});

const source = await readFile(new URL('../lib/bob/setup.ts', import.meta.url), 'utf8');
function harness() {
  const calls = [];
  const child = new EventEmitter(); child.stdout = new PassThrough(); child.kill = () => {}; child.pid = 42;
  const exports = {};
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const environment = { PATH: 'OS path', SystemRoot: 'C:\\Windows', SUPABASE_SERVICE_ROLE_KEY: 'private-supabase', BOB_API_KEY: 'private-bob', GITHUB_TOKEN: 'private-github', DEVRESOLVE_SESSION_SECRET: 'private-session' };
  vm.runInNewContext(js, { exports, setTimeout, clearTimeout, process: { platform: 'win32', versions: { node: '24.19.0' }, version: 'v24.19.0', env: environment, cwd: () => 'fixture-project' }, require: name => {
    if (name === 'node:child_process') return { spawn: (...args) => { calls.push(args); return child; } };
    if (name === 'node:path') return { join: (...parts) => parts.join('/') };
    if (name === './runner.ts') return { resolveLaunch: async () => ({}), checkBobAvailability: async () => ({}) };
    throw new Error('Unexpected import');
  } });
  return { ...exports, child, calls };
}
test('installer uses a fixed script, no shell, hides its window and excludes application credentials', () => {
  const setup = harness();
  assert.equal(setup.startSetup(), true);
  assert.equal(setup.startSetup(), false);
  const [, args, options] = setup.calls[0];
  assert.ok(args.includes('fixture-project/scripts/setup-bob.ps1'));
  assert.ok(args.includes('-Approve'));
  assert.equal(options.shell, false); assert.equal(options.windowsHide, true);
  assert.equal(options.env.PATH, 'OS path');
  for (const name of ['SUPABASE_SERVICE_ROLE_KEY', 'BOB_API_KEY', 'GITHUB_TOKEN', 'DEVRESOLVE_SESSION_SECRET']) assert.ok(!(name in options.env));
  setup.child.stdout.write('raw npm output must not be exposed\n');
  setup.child.stdout.write('{"stage":"node","message":"Node ready"}\n');
  setup.child.stdout.write('{"stage":"complete","message":"Tools ready"}\n');
  setup.child.emit('close', 0);
  assert.equal(setup.setupJob().status, 'complete');
  assert.ok(!setup.setupJob().events.some(event => event.message.includes('raw npm')));
});
test('zero exit without verification cannot claim success; failure permits a new approved retry', () => {
  const setup = harness(); setup.startSetup(); setup.child.emit('close', 0);
  assert.equal(setup.setupJob().status, 'failed');
  assert.equal(setup.startSetup(), true); setup.child.emit('close', 1);
  assert.equal(setup.setupJob().status, 'failed');
});
test('installation route rejects unauthorized callers before starting a process', async () => {
  const source = await readFile(new URL('../app/api/bob/setup/route.ts', import.meta.url), 'utf8');
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  let started = false;
  const exports = {};
  vm.runInNewContext(js, { exports, Response, require: name => {
    if (name === '@/lib/auth/session') return { requireRole: () => Response.json({ error: 'Developer access required.' }, { status: 403 }) };
    if (name === '@/lib/bob/setup') return { startSetup: () => { started = true; } };
    if (name === '@/lib/bob/setup-request') return { validateSetupRequest };
    throw new Error('Unexpected import');
  } });
  const response = await exports.POST(new Request('http://localhost:3000/api/bob/setup', { method: 'POST' }));
  assert.equal(response.status, 403); assert.equal(started, false);
});
