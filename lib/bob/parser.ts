import type { BobActivityEvent, BobJobStatus } from "@/types/bob";

type JsonObject = Record<string, unknown>;
type Tool = { name: string; file?: string; command?: string };

export interface ParsedBobResult {
  status: BobJobStatus;
  rootCause?: string;
  changedFiles: string[];
  validationSummary?: string;
  reason?: string;
  activity: BobActivityEvent[];
  bobTaskId?: string;
}

function object(value: unknown): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonObject : {};
}

function safePath(value: unknown): string | undefined {
  if (typeof value !== "string" || value.length > 500 || /[\r\n]/.test(value)) return undefined;
  // Do not surface credential filenames or credential file contents.
  if (/(?:^|[/\\])\.env|credential|secret|api.?key|\.pem$|\.key$/i.test(value)) return undefined;
  return value;
}

function commandKind(command: string): "test" | "build" | "other" {
  if (/\b(?:test|pytest|vitest|jest|mocha)\b/.test(command)) return "test";
  if (/\b(?:build|tsc|compile)\b/.test(command)) return "build";
  return "other";
}

/** Only safe activity and an explicit final summary become UI text. */
export class BobStreamParser {
  readonly activity: BobActivityEvent[] = [];
  bobTaskId?: string;
  private tools = new Map<string, Tool>();
  private finalMessage = "";
  private assistantSummary = "";
  private assistantText = "";
  private finalStatus?: string;
  private errorSeen = false;
  private validation = new Map<string, boolean>();

  consume(line: string) {
    let event: JsonObject;
    try { event = object(JSON.parse(line)); } catch { return; }
    if (event.isReasoning || event.type === "reasoning" || event.type === "thinking") return;
    const timestamp = typeof event.timestamp === "string" && Number.isFinite(Date.parse(event.timestamp))
      ? event.timestamp : new Date().toISOString();
    const emit = (activity: Omit<BobActivityEvent, "timestamp">) => {
      if (this.activity.length < 500) this.activity.push({ ...activity, timestamp });
    };
    if (event.type === "message") {
      // Some Bob Shell versions emit the final answer here and leave
      // result.last_message empty. Only accept an explicit summary from an
      // assistant message; never read user messages, reasoning or tool output.
      if (event.role === "assistant" && typeof event.content === "string" && !event.tool_calls && !event.toolCalls) {
        // Bob Shell 2.0.5 onStream emits text deltas, not complete messages.
        // Bound the buffer and never include reasoning/user/tool content.
        this.assistantText = (this.assistantText + event.content).slice(-64000);
        const block = this.assistantText.match(/DEVRESOLVE_RESULT_START\s*[\s\S]*?\s*DEVRESOLVE_RESULT_END/);
        if (block) this.assistantSummary = block[0];
      }
    } else if (event.type === "tool_use") {
      this.assistantText = "";
      if (typeof event.tool_name !== "string" || typeof event.tool_id !== "string") return;
      const name = event.tool_name.toLowerCase();
      const parameters = object(event.parameters);
      const file = safePath(parameters.file_path ?? parameters.path ?? parameters.file);
      const command = typeof parameters.command === "string" ? parameters.command : undefined;
      this.tools.set(event.tool_id, { name, file, command });
      if (/^(read|read_file|readfile|read_text_file)$/.test(name)) {
        emit({ kind: "reading_file", message: file ? `Reading ${file}` : "Reading repository file", file });
      } else if (/^(write|edit|write_file|edit_file|apply_patch|apply_diff|replace_in_file|write_to_file|patch_file)$/.test(name)) {
        emit({ kind: "modifying_file", message: file ? `Updating ${file}` : "Updating repository file", file });
      } else if (/execute_command|run_command|shell|terminal|bash/.test(name)) {
        const kind = commandKind(command || "");
        // The next attempt supersedes the prior attempt. Its actual outcome
        // is processed in tool_result; an unavailable exit code remains unknown.
        if (kind === "test" || kind === "build") this.validation.delete(kind);
        // Never echo arbitrary command arguments: they may contain credentials or prompts.
        emit({ kind: "running_command", message: kind === "test" ? "Running tests" : kind === "build" ? "Running build" : "Running repository command" });
      }
    } else if (event.type === "tool_result") {
      if (typeof event.tool_id !== "string") return;
      const tool = this.tools.get(event.tool_id);
      if (!tool) return;
      this.tools.delete(event.tool_id);
      const output = object(event.output);
      const exitCode = output.exit_code ?? output.exitCode;
      const knownExit = typeof exitCode === "number";
      const failed = event.status === "error" || event.status === "failed" || event.error !== undefined || (knownExit && exitCode !== 0);
      const success = knownExit && exitCode === 0 && !failed;
      if (tool.command) {
        const kind = commandKind(tool.command);
        if (kind === "test" || kind === "build") {
          if (knownExit || failed) this.validation.set(kind, success);
          const label = kind === "test" ? "Tests" : "Build";
          emit({ kind: kind === "test" ? "test_result" : "build_result",
            message: failed ? `${label} failed` : success ? `${label} passed` : `${label} command completed; exit code unavailable`,
            success: knownExit || failed ? success : undefined });
        }
      }
      if (failed) emit({ kind: "error", message: "A Bob tool reported an error" });
    } else if (event.type === "error") {
      this.errorSeen = true;
      emit({ kind: "error", message: "Bob reported an execution error or resource limit" });
    } else if (event.type === "result") {
      const stats = object(event.stats);
      if (typeof stats.task_id === "string" && /^[A-Za-z0-9_-]{1,150}$/.test(stats.task_id)) this.bobTaskId = stats.task_id;
      this.finalStatus = typeof event.status === "string" ? event.status : "error";
      this.finalMessage = typeof event.last_message === "string" ? event.last_message : "";
      emit({ kind: "task_completed", message: event.status === "success" ? "Bob task completed" : "Bob task stopped with an error", success: event.status === "success" });
    }
  }

  finish(exitCode: number): ParsedBobResult {
    const fields: Record<string, string> = {};
    const block = this.finalMessage.match(/DEVRESOLVE_RESULT_START\s*([\s\S]*?)\s*DEVRESOLVE_RESULT_END/)
      ?? this.assistantSummary.match(/DEVRESOLVE_RESULT_START\s*([\s\S]*?)\s*DEVRESOLVE_RESULT_END/);
    if (block) for (const line of block[1].split(/\r?\n/)) {
      const match = line.match(/^\s*(root_cause|changed_files|validation|status|reason)\s*:\s*(.*)$/i);
      if (match) fields[match[1].toLowerCase()] = match[2].trim().slice(0, 4000);
    }
    const validationSummary = fields.validation || undefined;
    const validationPassed = /^PASSED\b/i.test(validationSummary || "") && !/\b(?:failed|failure|skipped)\b/i.test(validationSummary || "");
    let status: BobJobStatus = "FAILED";
    let reason = fields.reason || undefined;
    if (exitCode !== 0 || this.finalStatus !== "success" || this.errorSeen) {
      reason = exitCode !== 0 ? `Bob Shell exited with code ${exitCode}.` : "Bob reported an error, resource limit, or incomplete stream.";
    } else if (!block) {
      reason = "Bob did not produce the required final summary.";
    } else if (fields.status === "NEEDS_HUMAN_INTERVENTION") {
      status = "NEEDS_HUMAN_INTERVENTION";
      reason ||= "Bob requested human review before continuing.";
    } else if (fields.status === "READY_FOR_REVIEW" && validationPassed && ![...this.validation.values()].includes(false)) {
      status = "READY_FOR_REVIEW";
    } else {
      reason = [...this.validation.values()].includes(false)
        ? "The latest observed test/build command failed; the success summary cannot override it."
        : reason || "Bob did not report successful validation; review the validation summary.";
    }
    const changedFiles = fields.changed_files && fields.changed_files.toUpperCase() !== "NONE"
      ? fields.changed_files.split(",").map(file => safePath(file.trim())).filter((file): file is string => !!file) : [];
    return { status, reason, rootCause: fields.root_cause || undefined, changedFiles,
      validationSummary, activity: [...this.activity], bobTaskId: this.bobTaskId };
  }
}

export function parseBobOutput(stdout: string, _stderrHint: string, exitCode: number): ParsedBobResult {
  const parser = new BobStreamParser();
  for (const line of stdout.split(/\r?\n/)) parser.consume(line);
  return parser.finish(exitCode);
}
