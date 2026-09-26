import { test } from "node:test";
import assert from "node:assert/strict";
import { databaseId, validateSubmission } from "../lib/bob/request.ts";
import { validateRepoUrl } from "../lib/bob/workspace.ts";
import { redactSecrets } from "../lib/bob/redact.ts";

test("bigint IDs are exact and unsafe numeric inputs are rejected", () => {
  assert.equal(databaseId("9223372036854775807"), "9223372036854775807");
  for (const id of ["9223372036854775808", "1 OR 1=1", "0", "-1", "1.2", Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal(databaseId(id), null);
  }
});

test("legacy request trusts only project ID and separates screenshot from expected behavior", () => {
  const input = validateSubmission({ issueId: "client-id", project: {
    id: "12", repoUrl: "https://attacker.example/repo", defaultBranch: "other"
  }, issue: { title: " Bug ", description: " Broken ", screenshotRef: "image.png", expectedBehavior: "Fixed" } });
  assert.deepEqual(input, { projectId: "12", issue: {
    title: "Bug", description: "Broken", screenshotRef: "image.png", expectedBehavior: "Fixed"
  } });
});

test("invalid and oversized requests fail before database or Bob work", () => {
  for (const input of [null, {}, { projectId: "1", issue: { title: "", description: "test" } },
    { projectId: "1", issue: { title: "x", description: "x".repeat(20001) } }]) {
    assert.throws(() => validateSubmission(input));
  }
});

test("repository URLs reject credentials, query arguments and shell-shaped paths", () => {
  validateRepoUrl("https://github.com/team/demo.git");
  for (const url of ["http://github.com/team/demo", "https://other.example/team/demo",
    "https://secret@github.com/team/demo", "https://github.com/team/demo?token=secret",
    "https://github.com/team/demo;command", "https://github.com/team/demo/tree/main"]) {
    assert.throws(() => validateRepoUrl(url));
  }
});

test("result redaction removes configured secrets before persistence or display", () => {
  const secret = 'test-key-with-"quotes"';
  const result = redactSecrets({ reason: `Error: ${secret}`, activity: [{ message: secret }] }, [secret, undefined]);
  assert.deepEqual(result, { reason: "Error: [REDACTED]", activity: [{ message: "[REDACTED]" }] });
});
