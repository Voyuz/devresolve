import { test, before } from 'node:test';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import assert from 'node:assert/strict';
import * as session from '../lib/auth/session.ts';
const { createSessionToken, verifySessionToken, sessionFromRequest, requireRole, SESSION_COOKIE } = session;
import { validateCredentials, passwordMatches } from '../lib/auth/login-input.ts';

before(() => { process.env.DEVRESOLVE_SESSION_SECRET = 'test-session-secret-that-is-long-enough-1234'; });

const dev = { id: '4', name: 'devuser', role: 'developer' };
const cookieRequest = (token, url = 'http://localhost/api/x') => new Request(url, { headers: { cookie: `other=1; ${SESSION_COOKIE}=${token}` } });

test('session tokens round-trip and reject tampering, expiry, and bad roles', () => {
  const token = createSessionToken(dev);
  assert.deepEqual({ ...verifySessionToken(token), exp: 0 }, { ...dev, exp: 0 });
  const [payload, signature] = token.split('.');
  const forged = Buffer.from(JSON.stringify({ ...dev, role: 'developer', id: '1', exp: 9e9 })).toString('base64url');
  assert.equal(verifySessionToken(`${forged}.${signature}`), null, 'payload change breaks the signature');
  assert.equal(verifySessionToken(`${payload}.${signature.slice(0, -2)}xx`), null);
  assert.equal(verifySessionToken(`${payload}.${signature}.extra`), null);
  assert.equal(verifySessionToken(createSessionToken(dev, Date.now() - 8 * 24 * 3600 * 1000)), null, 'expired after 7 days');
  assert.equal(verifySessionToken(createSessionToken({ ...dev, role: 'admin' })), null, 'unknown role');
  assert.equal(verifySessionToken(undefined), null);
  process.env.DEVRESOLVE_SESSION_SECRET = 'a-different-secret-that-is-also-long-enough-99';
  assert.equal(verifySessionToken(token), null, 'another secret cannot verify');
  process.env.DEVRESOLVE_SESSION_SECRET = 'test-session-secret-that-is-long-enough-1234';
});

test('route guard enforces sign-in and developer role', async () => {
  assert.equal((await requireRole(new Request('http://localhost/api/x'))).status, 401);
  const user = createSessionToken({ id: '1', name: 'reporter', role: 'user' });
  assert.equal(requireRole(cookieRequest(user)), null);
  assert.equal(requireRole(cookieRequest(user), 'developer').status, 403);
  assert.equal(requireRole(cookieRequest(createSessionToken(dev)), 'developer'), null);
  assert.equal(sessionFromRequest(cookieRequest(user)).name, 'reporter');
});

test('credentials are validated and passwords compared exactly', () => {
  assert.deepEqual(validateCredentials({ name: '  budi_01 ', password: 'secret1' }), { name: 'budi_01', password: 'secret1' });
  for (const body of [null, {}, { name: 'ab', password: 'secret1' }, { name: 'ok name', password: '12345' },
    { name: "x'; drop", password: 'secret1' }, { name: 'n'.repeat(51), password: 'secret1' }, { name: 'valid', password: 'p'.repeat(101) }]) {
    assert.throws(() => validateCredentials(body));
  }
  assert.equal(passwordMatches('secret1', 'secret1'), true);
  assert.equal(passwordMatches('secret1', 'Secret1'), false);
  assert.equal(passwordMatches('secret1', 'secret12'), false);
  assert.equal(passwordMatches(null, ''), false);
  assert.equal(passwordMatches('', ''), false, 'empty stored password never matches');
});

test('proxy redirects anonymous pages, blocks APIs, and restricts developer areas', async () => {
  // Load proxy.ts like Next.js would: resolve next/server and the @/ alias explicitly.
  const require = createRequire(import.meta.url);
  const nextServer = require('next/server.js');
  const exports = {};
  const js = ts.transpileModule(await readFile('proxy.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(js, { exports, URL, require: name => ({ 'next/server': nextServer, '@/lib/auth/session': session })[name] });
  const { proxy } = exports;
  const { NextRequest } = nextServer;
  const call = (path, token, method = 'GET') => proxy(new NextRequest(new URL(path, 'http://localhost'), {
    method, headers: token ? { cookie: `${SESSION_COOKIE}=${token}` } : {} }));
  const user = createSessionToken({ id: '1', name: 'reporter', role: 'user' });
  const developer = createSessionToken(dev);

  const anonymous = call('/issues/8?tab=1');
  assert.equal(anonymous.status, 307);
  assert.equal(new URL(anonymous.headers.get('location')).searchParams.get('next'), '/issues/8?tab=1');
  assert.equal(call('/api/issues').status, 401);
  assert.equal(call('/api/auth/login', undefined, 'POST').headers.get('x-middleware-next'), '1');
  assert.equal(call('/auth/login').headers.get('x-middleware-next'), '1');

  assert.equal(call('/issues', user).headers.get('x-middleware-next'), '1');
  assert.equal(new URL(call('/developer/triage', user).headers.get('location')).pathname, '/dashboard');
  assert.equal(new URL(call('/auth/login', user).headers.get('location')).pathname, '/dashboard');
  assert.equal(call('/api/bob/resolve', user, 'POST').status, 403);
  assert.equal(call('/api/issues/8/triage', user, 'POST').status, 403);
  assert.equal(call('/api/issues/8', user, 'PATCH').status, 403);
  assert.equal(call('/api/issues/8', user).headers.get('x-middleware-next'), '1', 'reporters can read issue details');
  assert.equal(call('/api/bob/jobs/abc', user).status, 403, 'Bob job details are developer-only');
  assert.equal(call('/api/projects', user, 'POST').status, 403, 'only developers add projects');
  assert.equal(call('/api/users', user).status, 403, 'the user list is developer-only');
  assert.equal(call('/api/projects', user).headers.get('x-middleware-next'), '1', 'reporters can list their projects');

  assert.equal(call('/developer/triage', developer).headers.get('x-middleware-next'), '1');
  assert.equal(new URL(call('/', developer).headers.get('location')).pathname, '/developer');
  assert.equal(call('/api/bob/resolve', developer, 'POST').headers.get('x-middleware-next'), '1');
  assert.equal(call('/api/projects', developer, 'POST').headers.get('x-middleware-next'), '1');
  assert.equal(call('/api/users', developer).headers.get('x-middleware-next'), '1');
});

test('reporters only see their own projects, and the issues and jobs under them', async () => {
  const { scopeWorkspace, canSeeProject } = await import('../lib/auth/scope.ts');
  const data = {
    projects: [{ id: '1' }, { id: '2' }, { id: '3' }],
    issues: [{ id: '10', ProjekId: '1' }, { id: '11', ProjekId: '2' }, { id: '12', ProjekId: '3' }],
    jobs: [{ issue_id: '10' }, { issue_id: '11' }, { issue_id: '12' }],
  };
  const mine = scopeWorkspace({ all: false, projectIds: new Set(['2']) }, data);
  assert.deepEqual(mine.projects.map(p => p.id), ['2']);
  assert.deepEqual(mine.issues.map(i => i.id), ['11']);
  assert.deepEqual(mine.jobs.map(j => j.issue_id), ['11']);
  assert.deepEqual(scopeWorkspace({ all: false, projectIds: new Set() }, data), { projects: [], issues: [], jobs: [] });
  assert.equal(scopeWorkspace({ all: true }, data), data, 'developers see everything');
  assert.equal(canSeeProject({ all: false, projectIds: new Set(['2']) }, null), false);
});

test('new projects need a name, a plain GitHub URL, and a safe branch', async () => {
  const { validateNewProject } = await import('../lib/project-input.ts');
  assert.deepEqual(validateNewProject({ name: ' Mini Shop ', repoUrl: 'https://github.com/o/r.git', ownerId: 3 }),
    { name: 'Mini Shop', repoUrl: 'https://github.com/o/r.git', defaultBranch: 'main', ownerId: '3' });
  assert.throws(() => validateNewProject({ name: 'Mini Shop', repoUrl: 'https://github.com/o/r' }), /owns this project/, 'owner is required');
  assert.throws(() => validateNewProject({ name: 'Mini Shop', repoUrl: 'https://github.com/o/r', ownerId: '1 OR 1=1' }), /owns this project/);
  for (const body of [{ name: 'x', repoUrl: 'https://github.com/o/r' }, { name: 'ok', repoUrl: 'cobaurl' },
    { name: 'ok', repoUrl: 'https://gitlab.com/o/r' }, { name: 'ok', repoUrl: 'https://github.com/o/r', defaultBranch: '--upload-pack=x' },
    { name: 'ok', repoUrl: 'https://github.com/o/r', defaultBranch: 'a..b' }, { name: 'ok', repoUrl: 'https://user:pw@github.com/o/r' }]) {
    assert.throws(() => validateNewProject({ ownerId: '3', ...body }), /name|URL|branch/, JSON.stringify(body));
  }
});
