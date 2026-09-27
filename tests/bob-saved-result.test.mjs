import { test } from "node:test";
import assert from "node:assert/strict";
import { resultFromJob, isRunningJob } from "../components/bob/saved-result.ts";

test("interim result cannot override the running database status", () => {
  const result = resultFromJob({ id: "job", issue_id: "17", status: "INVESTIGATING",
    result: { status: "FAILED" } });
  assert.equal(result.status, "INVESTIGATING");
  assert.deepEqual(result.activity, []);
  assert.equal(isRunningJob(result.status), true);
});

test("new running jobs render progress without a final result", () => {
  assert.equal(resultFromJob({ id: "job", issue_id: "17", status: "QUEUED", result: null }).status, "QUEUED");
});

test("completed results retain the review and stop polling", () => {
  const review = { status: "PENDING", patch: "diff", branch: "fix" };
  const result = resultFromJob({ id: "job", issue_id: "17", status: "READY_FOR_REVIEW", result: { review } });
  assert.deepEqual(result.review, review);
  assert.equal(isRunningJob(result.status), false);
  assert.equal(isRunningJob("FAILED"), false);
});
