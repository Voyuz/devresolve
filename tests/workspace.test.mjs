import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';

const source = await readFile(new URL('../lib/supabase/issues.ts', import.meta.url), 'utf8');
function store(results) {
  const calls = [];
  const client = { from(table) {
    const query = {
      select(columns) { calls.push({ table, columns }); return query; },
      insert(values) { calls.push({ table, values }); return query; },
      eq() { return query; }, in() { return query; },
      limit() { return Promise.resolve(results.shift()); },
      order() { return Promise.resolve(results.shift()); },
      single() { return Promise.resolve(results.shift()); },
      maybeSingle() { return Promise.resolve(results.shift()); },
    };
    return query;
  } };
  const exports = {};
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(js, { exports, process: { env: {} }, require: name => {
    if (name === 'server-only') return {};
    if (name === '@/lib/supabase/server') return { createSupabaseServerClient: () => client };
    throw new Error('Unexpected import');
  } });
  return { ...exports, calls };
}

test('normalized report uses enum status and preserves evidence without nonexistent legacy columns', async () => {
  const db = store([{ error: null }, { data: { id: '9007199254740993' }, error: null }]);
  const id = await db.saveIssue({ id: '1' }, { title: 'Email case', description: 'Case mismatch', expectedBehavior: 'Case insensitive', screenshotRef: 'screen.png (100 bytes)' });
  assert.equal(id, '9007199254740993');
  const payload = db.calls.find(call => call.values).values;
  assert.equal(payload.project_id, '1');
  assert.equal(payload.status, 'reported');
  assert.match(payload.description, /screen\.png/);
  assert.ok(!('ProjekId' in payload));
  assert.ok(!('screenshot_ref' in payload));
});
test('legacy report retains team column names and separate screenshot reference', async () => {
  const db = store([{ error: { code: '42703' } }, { data: { id: '2' }, error: null }]);
  await db.saveIssue({ id: '1' }, { title: 'Bug', description: 'Details', screenshotRef: 'screen.png' });
  const payload = db.calls.find(call => call.values).values;
  assert.equal(payload.ProjekId, '1'); assert.equal(payload.Status, 'OPEN');
  assert.equal(payload.screenshot_ref, 'screen.png'); assert.ok(!('project_id' in payload));
});
test('schema permission and connection failures do not silently fall back to legacy writes', async () => {
  const db = store([{ error: { code: '42501', message: 'private detail' } }]);
  await assert.rejects(db.saveIssue({ id: '1' }, { title: 'Bug', description: 'Details' }), /Cannot inspect issue schema/);
  assert.ok(!db.calls.some(call => call.values));
});
test('developer execution reloads the saved report with exact project ID and expected behavior', async () => {
  const db = store([{ error: null }, { data: { project_id: '9007199254740993', title: 'Saved title', description: 'Saved details', expected_behavior: 'Expected' }, error: null }]);
  const saved = await db.getIssue('42');
  assert.equal(saved.projectId, '9007199254740993'); assert.equal(saved.issue.title, 'Saved title');
  assert.equal(saved.issue.expectedBehavior, 'Expected');
});
test('an active job blocks another developer run for the same report before inserting a job', async () => {
  const db = store([{ data: [{ id: 'active' }], error: null }]);
  await assert.rejects(db.createExistingIssueJob({ repoUrl: 'https://github.com/team/demo.git', defaultBranch: 'main' }, '42'), /already has an active/);
  assert.ok(!db.calls.some(call => call.values));
});
