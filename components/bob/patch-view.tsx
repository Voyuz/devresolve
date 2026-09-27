"use client";

import { FileCode2, FileLock2 } from "lucide-react";

// Renders a unified git diff one file at a time: collapsible, with +/- counts and colored lines.
// Generated lockfiles are collapsed by default so the real source change stays readable.

const LOCKFILE = /(^|\/)(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|bun\.lockb?|npm-shrinkwrap\.json)$/;

interface FilePatch { path: string; lines: string[]; added: number; removed: number }

export function splitPatch(patch: string): FilePatch[] {
  const files: FilePatch[] = [];
  for (const line of patch.split("\n")) {
    const header = line.match(/^diff --git a\/(.+?) b\/(.+)$/);
    if (header) { files.push({ path: header[2], lines: [], added: 0, removed: 0 }); continue; }
    const file = files.at(-1);
    if (!file) continue;
    // Skip git metadata lines; keep hunks and content.
    if (/^(index |--- |\+\+\+ |new file mode|deleted file mode|similarity index|rename (from|to) )/.test(line)) continue;
    file.lines.push(line);
    if (line.startsWith("+")) file.added++;
    else if (line.startsWith("-")) file.removed++;
  }
  return files;
}

function lineClass(line: string) {
  if (line.startsWith("@@")) return "text-[#449199] bg-[#5ec0ca]/10";
  if (line.startsWith("+")) return "text-emerald-700 bg-emerald-50";
  if (line.startsWith("-")) return "text-red-700 bg-red-50";
  return "text-slate-600";
}

export function PatchView({ patch }: { patch: string }) {
  const files = splitPatch(patch);
  if (!files.length) return <pre className="max-h-96 overflow-auto whitespace-pre text-xs">{patch}</pre>;
  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500">
        {files.length} file{files.length > 1 ? "s" : ""} changed ·{" "}
        <span className="text-emerald-700">+{files.reduce((sum, file) => sum + file.added, 0)}</span>{" "}
        <span className="text-red-700">−{files.reduce((sum, file) => sum + file.removed, 0)}</span>
      </p>
      {files.map(file => {
        const lockfile = LOCKFILE.test(file.path);
        return (
          <details key={file.path} open={!lockfile} className="rounded-lg border border-slate-200 overflow-hidden">
            <summary className="flex items-center gap-2 px-3 py-2 bg-slate-50 cursor-pointer text-xs font-mono text-slate-700 select-none">
              {lockfile ? <FileLock2 className="w-3.5 h-3.5 text-slate-400 shrink-0" /> : <FileCode2 className="w-3.5 h-3.5 text-[#5ec0ca] shrink-0" />}
              <span className="truncate">{file.path}</span>
              {lockfile && <span className="font-sans text-[10px] text-slate-400">generated lockfile · collapsed</span>}
              <span className="ml-auto shrink-0 font-sans">
                <span className="text-emerald-700">+{file.added}</span> <span className="text-red-700">−{file.removed}</span>
              </span>
            </summary>
            <pre className="max-h-96 overflow-auto text-xs leading-5">
              {file.lines.map((line, index) => (
                <div key={index} className={`px-3 whitespace-pre ${lineClass(line)}`}>{line || " "}</div>
              ))}
            </pre>
          </details>
        );
      })}
    </div>
  );
}
