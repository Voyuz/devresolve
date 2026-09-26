// Fake Bob process for runner contract tests. Never invokes an IBM service.
if (process.argv.includes('--help')) {
  console.log('bob run --mode <mode> --format stream-json');
} else {
  let prompt = '';
  process.stdin.setEncoding('utf8');
  for await (const chunk of process.stdin) prompt += chunk;
  if (prompt === 'fixture:timeout') {
    setInterval(() => {}, 1000);
  } else {
    const event = { type: 'result', status: 'success', stats: { task_id: 'fixture-task-123' },
      last_message: 'DEVRESOLVE_RESULT_START\nroot_cause: Fixture bug\nchanged_files: auth.js\nvalidation: PASSED - tests and build passed\nstatus: READY_FOR_REVIEW\nDEVRESOLVE_RESULT_END' };
    console.log(JSON.stringify({ type: 'message', role: 'assistant', isReasoning: true, content: 'private fixture reasoning' }));
    const json = JSON.stringify(event);
    process.stdout.write(json.slice(0, 30));
    setTimeout(() => {
      process.stdout.write(json.slice(30) + '\n');
      // Diagnostics used only in tests, never UI.
      console.error(JSON.stringify({ cwd: process.cwd(), prompt, args: process.argv.slice(2),
        scoped: !process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.GITHUB_TOKEN && !!process.env.BOB_API_KEY }));
      process.exitCode = prompt === 'fixture:error' ? 1 : 0;
    }, 10);
  }
}
