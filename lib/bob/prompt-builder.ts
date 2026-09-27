/**
 * prompt-builder.ts
 *
 * Converts a DevResolve bug report into a structured IBM Bob task prompt.
 * The prompt instructs Bob to:
 *   - inspect the repository
 *   - investigate and identify the root cause
 *   - implement the smallest safe fix
 *   - run tests and build to validate
 *   - escalate when a decision requires human judgement
 */

import type { BobIssue, BobProject } from "@/types/bob";

export interface PromptContext {
  issueId: string;
  project: BobProject;
  issue: BobIssue;
  fixBranch: string;
}

/**
 * Builds the task prompt sent to IBM Bob Shell.
 */
export function buildBobPrompt(ctx: PromptContext): string {
  const { issueId, project, issue, fixBranch } = ctx;

  const expectedSection = issue.expectedBehavior
    ? `\n**Expected behavior:**\n${issue.expectedBehavior}\n`
    : "";

  return `# DevResolve Bug Fix Task

## Context
- **Issue ID:** ${issueId}
- **Project:** ${project.name}
- **Repository:** ${project.repoUrl}
- **Fix branch:** ${fixBranch}

## Bug Report

**Title:** ${issue.title}

**Description:**
${issue.description}
${expectedSection}
${issue.screenshotRef ? `Screenshot reference (not automatically downloaded): ${issue.screenshotRef}\n` : ""}
## Your Task

You are acting as a software engineer investigating and fixing the bug described above.
The repository has already been cloned into the current working directory and you are on branch \`${fixBranch}\`.

Follow these steps in order:

### Step 1 — Understand the codebase
- List the top-level files and directories.
- Read AGENTS.md in the root and any applicable subdirectory before changing code.
- Read the README if one exists.
- Identify the language, framework, and project structure.
- Find the files most likely related to the bug.

### Step 2 — Investigate the bug
- Read the relevant source files.
- Trace the execution path related to the reported behavior.
- Identify the exact root cause.
- State the root cause clearly before making any changes.

### Step 3 — Implement the fix
- Make the smallest safe change that resolves the root cause.
- Do not refactor unrelated code.
- Do not change public APIs unless strictly required.
- Stage your changes with git.

### Step 4 — Validate
- Run the existing test suite if one is present.
- Run the build if a build command is available.
- If tests or the build fail because of your change, revise until they pass.
- Record the exact commands and observed outcomes. Do not claim tests/build passed when they were skipped or failed.
- If validation cannot be completed, explain why and request human intervention.

### Step 5 — Stop for human review
- Leave the smallest fix in this local branch and summarize it. Do not commit, push, open a PR, or merge automatically.

## Important constraints

**Do NOT attempt to fix the issue if any of the following apply — instead, stop and request human intervention:**
- The correct fix requires a business rule or product decision that cannot be safely inferred from the code alone.
- The fix requires a security-sensitive decision, such as weakening authentication, changing authorization, or bypassing credential verification.
- An explicitly requested email case-normalization fix can be investigated, but do not alter password verification or unrelated authentication policy.
- The fix requires destructive data changes or migration of user data.
- The fix requires an architectural change affecting multiple services or contracts.
- The root cause is ambiguous and multiple valid interpretations exist with meaningfully different implications.
- You need credentials, external service access, or environment secrets that are not present in the repository.
- Never read credential files, environment files, private keys, or local secret configuration. Do not print secrets or hidden reasoning.

When requesting human intervention, state:
1. Why you cannot complete the fix autonomously.
2. What information or decision is needed.
3. Which files and lines are most relevant.

## Output format

After completing all steps (or when requesting human intervention), output a summary block in exactly this format:

\`\`\`
DEVRESOLVE_RESULT_START
root_cause: <one sentence>
changed_files: <comma-separated list, or NONE>
validation: <PASSED | FAILED | SKIPPED — commands and actual test/build outcomes>
status: <READY_FOR_REVIEW | NEEDS_HUMAN_INTERVENTION | FAILED>
reason: <required when status is NEEDS_HUMAN_INTERVENTION, otherwise omit>
DEVRESOLVE_RESULT_END
\`\`\`

Use READY_FOR_REVIEW only after successful validation. Use NEEDS_HUMAN_INTERVENTION when a decision or missing prerequisite blocks safe progress. Use FAILED when execution or validation fails.
`;
}
