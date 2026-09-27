import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BobStreamParser, parseBobOutput } from '../lib/bob/parser.ts';
import { buildBobPrompt } from '../lib/bob/prompt-builder.ts';

const summary = (status = 'READY_FOR_REVIEW', validation = 'PASSED - npm test PASS; npm run build PASS') =>
  `DEVRESOLVE_RESULT_START\nroot_cause: Email comparison used case-sensitive strings\nchanged_files: src/auth.js, src/auth.test.js\nvalidation: ${validation}\nstatus: ${status}\nreason: Explicit review needed\nDEVRESOLVE_RESULT_END`;
const final = (status, validation) => ({ type: 'result', status: 'success', stats: { task_id: 'task-123' }, last_message: summary(status, validation) });
const output = events => events.map(event => JSON.stringify(event)).join('\n');

test('stream-json exposes only tool actions and final summary, never reasoning or raw outputs', () => {
  const raw = output([
    { type: 'message', role: 'assistant', isReasoning: true, content: 'HIDDEN reasoning: read secret.js and run npm test' },
    { type: 'message', role: 'user', content: summary() },
    { type: 'tool_use', tool_name: 'read_file', tool_id: 'read-1', parameters: { path: 'AGENTS.md' } },
    { type: 'tool_result', tool_id: 'read-1', status: 'success', output: 'SECRET FILE CONTENT' },
    { type: 'tool_use', tool_name: 'edit_file', tool_id: 'edit-1', parameters: { path: 'src/auth.js', content: 'SECRET PATCH CONTENT' } },
    { type: 'tool_use', tool_name: 'execute_command', tool_id: 'test-1', parameters: { command: 'npm test --token=SECRET_ARGUMENT' } },
    { type: 'tool_result', tool_id: 'test-1', status: 'success', output: { exit_code: 0, stdout: 'SECRET OUTPUT' } },
    { type: 'tool_use', tool_name: 'execute_command', tool_id: 'build-1', parameters: { command: 'npm run build' } },
    { type: 'tool_result', tool_id: 'build-1', status: 'success', output: { exit_code: 1 } },
    final(),
  ]);
  const parsed = parseBobOutput(raw, 'SECRET STDERR', 0);
  assert.equal(parsed.status, 'FAILED');
  assert.equal(parsed.bobTaskId, 'task-123');
  assert.deepEqual(parsed.changedFiles, ['src/auth.js', 'src/auth.test.js']);
  assert.ok(parsed.activity.some(event => event.message === 'Reading AGENTS.md'));
  assert.ok(parsed.activity.some(event => event.kind === 'test_result' && event.success === true));
  assert.ok(parsed.activity.some(event => event.kind === 'build_result' && event.success === false));
  assert.doesNotMatch(JSON.stringify(parsed), /HIDDEN|SECRET/);
});

test('nonzero process exit, error result, missing result or skipped validation cannot claim ready', () => {
  assert.equal(parseBobOutput(output([final()]), '', 0).status, 'READY_FOR_REVIEW');
  assert.equal(parseBobOutput(output([final()]), '', 1).status, 'FAILED');
  assert.equal(parseBobOutput(output([{ ...final(), status: 'error' }]), '', 0).status, 'FAILED');
  assert.equal(parseBobOutput(output([final('READY_FOR_REVIEW', 'SKIPPED')]), '', 0).status, 'FAILED');
  assert.equal(parseBobOutput(summary(), '', 0).status, 'FAILED');
  assert.equal(parseBobOutput(output([{ type: 'message', role: 'user', content: summary() }]), '', 0).status, 'FAILED');
});

test('a successful rerun can replace the earlier failed validation outcome', () => {
  const events = [
    { type: 'tool_use', tool_id: 'first', tool_name: 'execute_command', parameters: { command: 'npm test' } },
    { type: 'tool_result', tool_id: 'first', status: 'success', output: { exit_code: 1 } },
    { type: 'tool_use', tool_id: 'retry', tool_name: 'execute_command', parameters: { command: 'npm test' } },
    { type: 'tool_result', tool_id: 'retry', status: 'success', output: { exit_code: 0 } }, final(),
  ];
  assert.equal(parseBobOutput(output(events), '', 0).status, 'READY_FOR_REVIEW');
});

test('assistant final summary is accepted when result.last_message is empty, but never reasoning or user content', () => {
  const result = { type: 'result', status: 'success', last_message: '', stats: { task_id: 'task-123' } };
  assert.equal(parseBobOutput(output([{ type: 'message', role: 'assistant', content: summary() }, result]), '', 0).status, 'READY_FOR_REVIEW');
  for (const message of [
    { type: 'message', role: 'user', content: summary() },
    { type: 'message', role: 'assistant', isReasoning: true, content: summary() },
    { type: 'message', role: 'assistant', toolCalls: [{ name: 'read_file' }], content: summary() },
  ]) assert.equal(parseBobOutput(output([message, result]), '', 0).status, 'FAILED');
});

test('a PASSED heading cannot override a final summary that says build failed', () => {
  const result = parseBobOutput(output([final('READY_FOR_REVIEW', 'PASSED - npm test passed; npm run build failed with a pre-existing error')]), '', 0);
  assert.equal(result.status, 'FAILED');
  assert.ok(result.rootCause);
  assert.deepEqual(result.changedFiles, ['src/auth.js', 'src/auth.test.js']);
});

test('Bob Shell text deltas reconstruct a final summary without accepting reasoning fragments', () => {
  const text = summary();
  const events = [];
  for (let i = 0; i < text.length; i += 7) events.push({ type: 'message', role: 'assistant', content: text.slice(i, i + 7) });
  events.push({ type: 'result', status: 'success', last_message: null });
  const parsed = parseBobOutput(output(events), '', 0);
  assert.equal(parsed.status, 'READY_FOR_REVIEW');
  assert.equal(parsed.rootCause, 'Email comparison used case-sensitive strings');
  assert.equal(parseBobOutput(output(events.map(e=>e.type==='message'?{...e,isReasoning:true}:e)), '', 0).status, 'FAILED');
});

test('retry with an unknown exit code does not retain the obsolete failure or fabricate a pass event', () => {
  const events = [
    { type: 'tool_use', tool_id: 'first', tool_name: 'execute_command', parameters: { command: 'npm test' } },
    { type: 'tool_result', tool_id: 'first', status: 'error', error: { message: 'Exit code: 1' } },
    { type: 'tool_use', tool_id: 'retry', tool_name: 'execute_command', parameters: { command: 'npm test' } },
    { type: 'tool_result', tool_id: 'retry', status: 'success', output: 'All tests passed' }, final(),
  ];
  const parsed = parseBobOutput(output(events), '', 0);
  assert.equal(parsed.status, 'READY_FOR_REVIEW');
  assert.equal(parsed.activity.filter(e=>e.kind==='test_result').at(-1).success, undefined);
  assert.equal(parseBobOutput(output(events.slice(0,-1).concat(final('READY_FOR_REVIEW','SKIPPED'))), '', 0).status, 'FAILED');
});

test('human escalation retains the explicit reason without fabricating events', () => {
  const result = parseBobOutput(output([final('NEEDS_HUMAN_INTERVENTION', 'SKIPPED')]), '', 0);
  assert.equal(result.status, 'NEEDS_HUMAN_INTERVENTION');
  assert.equal(result.reason, 'Explicit review needed');
  assert.equal(result.activity.length, 1);
});

test('malformed and unknown events are ignored; completion without command exit code is not a pass', () => {
  const stream = new BobStreamParser();
  stream.consume('not-json'); stream.consume('{');
  stream.consume(JSON.stringify({ type: 'thinking', content: 'private' }));
  stream.consume(JSON.stringify({ type: 'tool_use', tool_id: 't', tool_name: 'execute_command', parameters: { command: 'npm test' } }));
  stream.consume(JSON.stringify({ type: 'tool_result', tool_id: 't', status: 'success', output: 'OK' }));
  assert.equal(stream.activity.at(-1).success, undefined);
  assert.doesNotMatch(stream.activity.at(-1).message, /passed/);
});

test('prompt reads agent instructions, requests validation and preserves human decision boundaries', () => {
  const prompt = buildBobPrompt({ issueId: '12', project: { id: '3', name: 'demo-login-app', repoUrl: 'https://github.com/team/demo', defaultBranch: 'main' },
    issue: { title: 'Capitalized email fails', description: 'User@Example.com should login', screenshotRef: 'local-file: screenshot.png' }, fixBranch: 'devresolve/issue-12' });
  for (const instruction of ['AGENTS.md', 'destructive data changes', 'security-sensitive decision', 'case-normalization', 'Do not commit', 'Screenshot reference', 'DEVRESOLVE_RESULT_START']) assert.ok(prompt.includes(instruction));
});
