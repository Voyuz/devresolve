"use client";

import React, { useState, useRef, Suspense } from "react";
import Link from "next/link";
import { useWorkspace } from "@/components/layout/use-workspace";
import { useRouter, useSearchParams } from "next/navigation";
import {
  FileText,
  ChevronLeft,
  Send,
  FolderOpen,
  CheckCircle,
  AlertTriangle,
  Paperclip,
  X,
  Sparkles,
} from "lucide-react";

// ─── Demo bug cases (quick-fill chips) ───────────────────────────────────────
const DEMO_CASES = [
  {
    id: 1,
    title: "Product with stock = 0 can still be purchased",
    description:
      "When product stock is depleted (qty = 0), the 'Buy Now' button remains active and the checkout flow still proceeds. The order is created successfully but stock becomes negative.",
    expected: "System rejects the transaction and shows a 'Out of Stock' error when stock = 0.",
    actual: "Order is created, payment is deducted, stock becomes negative in the database.",
    steps: "1. Open the checkout page\n2. Add an out-of-stock item (qty = 0)\n3. Click 'Buy Now'\n4. Observe that the order is created successfully",
    log: "[ERROR] OrderService: Order #ORD-98842 created. Stock value for PID #482 is -1...",
    urgency: "CRITICAL",
  },
  {
    id: 2,
    title: "Double balance deduction when customer clicks pay button twice",
    description:
      "When the user clicks the 'Pay' button twice quickly, the system processes two transactions simultaneously and deducts the balance twice.",
    expected: "Pay button is disabled after the first click; only one transaction is processed.",
    actual: "Two POST /payment requests are sent and both succeed — balance is deducted twice.",
    steps:
      "1. Navigate to the payment page\n2. Click 'Pay' twice in rapid succession\n3. Check transaction history",
    log: "[WARN] PaymentService: Duplicate transaction detected for orderId=ORD-99201. Both processed.",
    urgency: "CRITICAL",
  },
  {
    id: 3,
    title: "Expired JWT session token does not auto-refresh on active page",
    description:
      "After the JWT token expires (15 min), the currently active page does not automatically refresh the token. The user must manually log out and log back in.",
    expected: "Refresh token is used automatically to extend the session without interruption.",
    actual: "API calls fail with 401 Unauthorized, user is not redirected, UI freezes.",
    steps:
      "1. Log in to the application\n2. Wait 15 minutes (token expiry)\n3. Perform any action on the page",
    log: "[ERROR] AuthMiddleware: JWT expired at 2024-01-15T10:23:44Z. Refresh token not attempted.",
    urgency: "HIGH",
  },
];

// ─── Field label component ────────────────────────────────────────────────────
function FieldLabel({
  children,
  required,
  hint,
}: {
  children: React.ReactNode;
  required?: boolean;
  hint?: string;
}) {
  return (
    <div className="flex items-center justify-between mb-2">
      <label className="text-[11px] font-bold uppercase tracking-widest text-zinc-700">
        {children}
        {required && <span className="text-dev-terracotta ml-1">*</span>}
      </label>
      {hint && (
        <span className="text-[10px] text-dev-slate/40 font-medium italic">{hint}</span>
      )}
    </div>
  );
}

// ─── Shared field styles ──────────────────────────────────────────────────────
const inputCls =
  "w-full bg-white border border-zinc-200 rounded-xl px-4 h-12 text-[13px] text-dev-slate placeholder:text-zinc-300 focus:outline-none focus:border-dev-cyan focus:ring-2 focus:ring-dev-cyan/20 transition-all";

const textareaCls =
  "w-full bg-white border border-zinc-200 rounded-xl px-4 py-3 text-[13px] text-dev-slate placeholder:text-zinc-300 focus:outline-none focus:border-dev-cyan focus:ring-2 focus:ring-dev-cyan/20 transition-all resize-none leading-relaxed";

const monoTextareaCls =
  "w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-[12px] text-dev-terracotta font-mono placeholder:text-zinc-300 focus:outline-none focus:border-dev-cyan focus:ring-2 focus:ring-dev-cyan/20 transition-all resize-none leading-relaxed";

// ─── Section card wrapper ─────────────────────────────────────────────────────
function Section({ children, accent }: { children: React.ReactNode; accent?: string }) {
  return (
    <div
      className={`bg-white border rounded-2xl p-6 shadow-sm ${
        accent ? `border-l-4 ${accent} border-zinc-100` : "border-zinc-100"
      }`}
    >
      {children}
    </div>
  );
}

// ─── Inner Form ───────────────────────────────────────────────────────────────
function NewIssueForm() {
  const router = useRouter();
  const params = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const workspace = useWorkspace();
  // The project is chosen on the Projects page (?projectId=) and cannot be changed here. With no choice in the URL,
  // a reporter who owns exactly one project gets that one; otherwise they must pick on the Projects page.
  const requestedProject = params.get("projectId");
  const project = requestedProject
    ? workspace.projects.find(item => item.id === requestedProject)
    : workspace.projects.length === 1 ? workspace.projects[0] : undefined;
  const projectId = project?.id ?? "";
  const projectName = project?.name ?? (workspace.loading ? "Loading..." : "No project selected");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [title,        setTitle]        = useState("");
  const [description,  setDescription]  = useState("");
  const [expected,     setExpected]     = useState("");
  const [actual,       setActual]       = useState("");
  const [steps,        setSteps]        = useState("");
  const [logError,     setLogError]     = useState("");
  const [attachments,  setAttachments]  = useState<File[]>([]);
  const [submitted,    setSubmitted]    = useState(false);

  function applyDemo(c: (typeof DEMO_CASES)[0]) {
    setTitle(c.title);
    setDescription(c.description);
    setExpected(c.expected);
    setActual(c.actual);
    setSteps(c.steps);
    setLogError(c.log);
  }

  function handleFiles(files: FileList | null) {
    if (!files) return;
    setAttachments((prev) => [...prev, ...Array.from(files)]);
  }

  function removeFile(idx: number) {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true); setError("");
    try {
      const response = await fetch("/api/issues", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, issue: { title,
          // Steps have no dedicated column; actual behavior and the log are stored in their own columns.
          description: [description, steps && "Steps to reproduce: " + steps].filter(Boolean).join("\n\n"),
          expectedBehavior: expected,
          actualBehavior: actual || undefined,
          errorLog: logError || undefined,
          screenshotRef: attachments.map(file => file.name + " (" + file.size + " bytes, " + file.type + ")").join("; ").slice(0, 2000),
        } }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Cannot save report.");
      setSubmitted(true);
    } catch (error) { setError(error instanceof Error ? error.message : "Cannot save report."); }
    finally { setSaving(false); }
  }

  // ── Success screen ──────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="py-24 text-center space-y-5">
        <div className="w-20 h-20 bg-dev-mint/10 border border-dev-mint/30 rounded-full flex items-center justify-center mx-auto">
          <Send size={32} className="text-dev-mint" />
        </div>
        <h2 className="text-2xl font-bold text-dev-slate">Issue Submitted!</h2>
        <p className="text-dev-slate/50 text-sm leading-relaxed">
          Your bug report is saved in Supabase and is awaiting developer triage.
          <br /><button onClick={() => router.push("/issues")} className="text-dev-cyan underline">View reports</button>
        </p>
        <div className="h-1 w-48 mx-auto bg-zinc-100 rounded-full overflow-hidden mt-4">
          <div className="h-1 bg-dev-cyan rounded-full animate-pulse w-full" />
        </div>
      </div>
    );
  }

  // ── Form ────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8">

      {/* Back nav */}
      <button
        type="button"
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-dev-slate/40 hover:text-dev-cyan text-sm font-medium mb-7 transition-colors"
      >
        <ChevronLeft size={16} />
        Back to Project Selection
      </button>

      {/* ── Header card ─────────────────────────────────────────────────────── */}
      <div className="bg-white border border-zinc-100 rounded-2xl p-7 mb-6 shadow-sm">

        {/* breadcrumb + project badge */}
        <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
          <div className="flex items-center gap-2 text-dev-cyan text-[11px] font-bold uppercase tracking-widest">
            <FileText size={14} />
            <span>Bug Report Form</span>
          </div>
          <div className="flex items-center gap-2 bg-dev-cyan/10 border border-dev-cyan/20 rounded-full px-4 py-1.5">
            <span className="text-[10px] text-dev-slate/40 font-bold uppercase tracking-wide">
              Selected project:
            </span>
            <FolderOpen size={12} className="text-dev-cyan" />
            <span className="text-[12px] font-bold text-dev-cyan">
              {projectName}{projectId && ` (${projectId})`}
            </span>
          </div>
        </div>

        {/* title + subtitle */}
        <h1 className="text-2xl font-bold text-dev-slate leading-tight mb-2">
          {project ? `Submit Bug / Issue for ${project.name}` : "Submit a Bug Report"}
        </h1>
        <p className="text-dev-slate/50 text-sm leading-relaxed">
          Describe the bug. A developer will review the report and start Bob investigation.
        </p>

        {/* Demo quick-fill chips */}
        <div className="mt-5 pt-5 border-t border-zinc-100">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={13} className="text-dev-sand" />
            <span className="text-[11px] font-bold text-dev-sand uppercase tracking-widest">
              Load Sample Case (Hackathon Demo):
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {DEMO_CASES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => applyDemo(c)}
                className="flex items-center gap-1.5 text-[11px] font-medium bg-zinc-50 hover:bg-dev-cyan/5 border border-zinc-200 hover:border-dev-cyan/40 text-zinc-600 hover:text-dev-cyan rounded-lg px-3 py-1.5 transition-all max-w-[260px]"
              >
                <span className="text-dev-cyan font-bold shrink-0">#{c.id}</span>
                <span className="truncate">{c.title}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Form fields ─────────────────────────────────────────────────────── */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {(error || workspace.error) && <p role="alert" className="text-red-600">{error || workspace.error}</p>}
        <Section><FieldLabel required hint="Chosen on the Projects page">Project</FieldLabel>
          <input
            type="text"
            value={projectName}
            readOnly
            aria-readonly="true"
            tabIndex={-1}
            onKeyDown={e => e.preventDefault()}
            className={`${inputCls} bg-zinc-50 cursor-default select-none ${project ? "text-dev-slate font-semibold" : "text-zinc-400"}`}
          />
          {!workspace.loading && !project && (
            <p className="mt-2 text-xs text-dev-terracotta">
              {requestedProject ? "This project is not available to your account." : "Choose the project this bug belongs to."}
            </p>
          )}
          <Link href="/projects" className="mt-2 inline-block text-xs font-semibold text-dev-cyan hover:underline">
            {project ? "Change project" : "Choose a project"} →
          </Link>
        </Section>

        {/* Bug Title */}
        <Section>
          <FieldLabel required>Bug Title</FieldLabel>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputCls}
            placeholder="e.g. Product with stock = 0 can still be purchased"
          />
        </Section>

        {/* Problem Description */}
        <Section>
          <FieldLabel required>Problem Description / Context</FieldLabel>
          <textarea
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className={textareaCls}
            placeholder="Describe the condition under which the error or anomalous behaviour occurs..."
          />
        </Section>

        {/* Expected vs Actual — side by side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

          {/* Expected */}
          <div className="bg-white border border-zinc-100 border-l-4 border-l-dev-mint rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle size={14} className="text-dev-mint" />
              <label className="text-[11px] font-bold uppercase tracking-widest text-dev-mint/90">
                Expected Behavior
              </label>
            </div>
            <textarea
              value={expected}
              onChange={(e) => setExpected(e.target.value)}
              rows={4}
              className={textareaCls + " focus:border-dev-mint focus:ring-dev-mint/20"}
              placeholder="e.g. System rejects the transaction and displays an 'Out of Stock' error..."
            />
          </div>

          {/* Actual */}
          <div className="bg-white border border-zinc-100 border-l-4 border-l-dev-terracotta rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={14} className="text-dev-terracotta" />
              <label className="text-[11px] font-bold uppercase tracking-widest text-dev-terracotta/90">
                Actual Behavior (What Happened)
              </label>
            </div>
            <textarea
              value={actual}
              onChange={(e) => setActual(e.target.value)}
              rows={4}
              className={textareaCls + " focus:border-dev-terracotta focus:ring-dev-terracotta/20"}
              placeholder="e.g. Order is created, payment deducted, stock becomes negative..."
            />
          </div>
        </div>

        {/* Reproduction Steps */}
        <Section>
          <FieldLabel>Steps to Reproduce</FieldLabel>
          <textarea
            value={steps}
            onChange={(e) => setSteps(e.target.value)}
            rows={4}
            className={textareaCls}
            placeholder={"1. Open the checkout page\n2. Add an out-of-stock item\n3. Click 'Buy Now'\n4. Observe the result"}
          />
        </Section>

        {/* Log / Error Trace */}
        <Section>
          <FieldLabel hint="Optional — but very helpful for AI & Bob">
            Error Log / Console Trace / HTTP Response
          </FieldLabel>
          <textarea
            value={logError}
            onChange={(e) => setLogError(e.target.value)}
            rows={5}
            className={monoTextareaCls}
            placeholder="[ERROR] OrderService: Order #ORD-98842 created. Stock value for PID #482 is -1..."
          />
        </Section>

        {/* File Attachments */}
        <Section>
          <FieldLabel hint="Optional">
            Supporting Files / Evidence
          </FieldLabel>
          <div
            className="border-2 border-dashed border-zinc-200 hover:border-dev-cyan/50 rounded-xl p-6 text-center cursor-pointer transition-all group"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
          >
            <Paperclip size={20} className="mx-auto mb-2 text-zinc-300 group-hover:text-dev-cyan/60 transition-colors" />
            <p className="text-[12px] text-zinc-400 group-hover:text-dev-slate/60 transition-colors">
              Drag &amp; drop or{" "}
              <span className="text-dev-cyan font-semibold">click to upload</span>
            </p>
            <p className="text-[10px] text-zinc-300 mt-1">
              Screenshots, log files, videos (.png .jpg .mp4 .log .txt) — max 10 MB
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".png,.jpg,.jpeg,.gif,.mp4,.log,.txt,.pdf"
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </div>

          {attachments.length > 0 && (
            <div className="mt-4 space-y-2">
              {attachments.map((f, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between bg-zinc-50 border border-zinc-100 rounded-lg px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <Paperclip size={12} className="text-dev-cyan/60" />
                    <span className="text-[12px] text-dev-slate/70 font-medium truncate max-w-[260px]">
                      {f.name}
                    </span>
                    <span className="text-[10px] text-zinc-300">
                      ({(f.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(idx)}
                    className="text-zinc-300 hover:text-dev-terracotta transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Section>

        <p className="text-xs text-zinc-500">Attachments save filename, size, and type only. File contents are not uploaded or analyzed.</p>
        {/* Action Buttons */}
        <div className="flex gap-3 pt-1 pb-8">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-3 border border-zinc-200 hover:border-dev-slate/30 text-dev-slate/50 hover:text-dev-slate rounded-xl font-semibold text-sm transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || workspace.loading || !projectId || !title || !description}
            className="flex-1 py-3.5 bg-dev-cyan hover:bg-dev-cyan/90 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.99] shadow-lg shadow-dev-cyan/20"
          >
            <Send size={15} />
            {saving ? "Saving report?" : "Submit Report"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Page wrapper (Suspense required for useSearchParams) ─────────────────────
export default function NewIssuePage() {
  return (
    <Suspense fallback={<div className="p-8 text-dev-slate/30 text-sm">Loading form…</div>}>
      <NewIssueForm />
    </Suspense>
  );
}
