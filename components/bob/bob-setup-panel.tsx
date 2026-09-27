"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { SetupJob } from "@/lib/bob/setup";

interface SetupStatus {
  nodeVersion: string; nodeReady: boolean; bobInstalled: boolean; apiKeyConfigured: boolean;
  ready: boolean; reason: string | null; supported: boolean; job: SetupJob | null;
}
export function BobSetupPanel() {
  const [status, setStatus] = useState<SetupStatus | null>(null);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);
  const running = status?.job?.status === "running";
  const refresh = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch("/api/bob/setup", { cache: "no-store", signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Cannot check setup.");
      setStatus(data); setError("");
    } catch (error) { if (!signal?.aborted) setError(error instanceof Error ? error.message : "Cannot check setup."); }
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    const initial = setTimeout(() => void refresh(controller.signal), 0);
    const timer = running ? setInterval(() => void refresh(controller.signal), 3000) : undefined;
    return () => { controller.abort(); clearTimeout(initial); clearInterval(timer); };
  }, [refresh, running]);
  async function install() {
    if (!consent || starting || running) return;
    setStarting(true); setError("");
    try {
      const response = await fetch("/api/bob/setup", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ consent: true }),
      });
      const data = await response.json();
      if (!response.ok && response.status !== 409) throw new Error(data.error || "Cannot start installation.");
      setStatus(previous => previous ? { ...previous, job: data.job } : previous);
      setConsent(false);
      await refresh();
    } catch (error) { setError(error instanceof Error ? error.message : "Installation failed."); }
    finally { setStarting(false); }
  }
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/developer/bob-tasks" className="text-sm text-dev-cyan underline">Back to Bob Resolution</Link>
        <h1 className="mt-3 text-2xl font-bold text-dev-slate">Set up Node.js and Bob Shell</h1>
        <p className="mt-2 text-sm text-slate-500">One setup installs missing tools on the computer running DevResolve. It does not install software on a remote visitor&apos;s computer.</p>
      </div>
      {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      {!status && !error && <p>Checking installed tools...</p>}
      {status && <>
        <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-6 sm:grid-cols-3">
          <div><p className="text-sm font-semibold">Node.js 24+</p><p className="text-sm text-slate-500">{status.nodeVersion} {status.nodeReady ? "(ready)" : "(upgrade needed)"}</p></div>
          <div><p className="text-sm font-semibold">Bob Shell</p><p className="text-sm text-slate-500">{status.bobInstalled ? "Found" : "Not installed"}</p></div>
          <div><p className="text-sm font-semibold">Bob API key</p><p className="text-sm text-slate-500">{status.apiKeyConfigured ? "Configured" : "Add to .env.local"}</p></div>
        </div>
        {status.ready && <p className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">Bob Shell is ready. Existing compatible installations are preserved.</p>}
        {status.reason && !status.ready && <p className="text-sm text-amber-700">{status.reason}</p>}
        {!status.supported ? <p className="text-sm">Combined automatic setup currently supports Windows. Use the <a href="https://bob.ibm.com/docs/shell/getting-started/install-and-setup" className="text-dev-cyan underline" target="_blank" rel="noreferrer">official IBM installation guide</a> on macOS or Linux.</p> : <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
          <p className="text-sm text-slate-600">Setup downloads Node.js 24 when needed, then Bob Shell from official vendor sources. Files and installation logs are stored in <code>.local-tools/</code>, which is excluded from Git and Bob. Your global Node installation is preserved.</p>
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} disabled={running || starting} className="mt-1" />
            <span>I approve downloading and installing the required Node.js and Bob Shell packages on this local server computer.</span>
          </label>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => void install()} disabled={!consent || starting || running} className="rounded-xl bg-dev-cyan px-5 py-3 text-sm font-semibold text-white disabled:opacity-40">
              {running || starting ? "Installing..." : status.job?.status === "failed" ? "Approve and retry setup" : "Approve and install Node + Bob"}
            </button>
            <button type="button" onClick={() => void refresh()} className="rounded-xl border px-5 py-3 text-sm">Check again</button>
          </div>
        </div>}
        {status.job && <div className="space-y-2 rounded-2xl border bg-white p-6" aria-live="polite">
          <h2 className="font-semibold">Installation: {status.job.status}</h2>
          {status.job.events.map((event, index) => <p key={index} className="text-sm text-slate-600"><span className="font-medium">{event.stage}:</span> {event.message}</p>)}
        </div>}
        <p className="text-sm text-slate-500">The API key is configured separately in <code>.env.local</code> using <code>BOB_API_KEY</code> or <code>BOBSHELL_API_KEY</code>. Restart the app after upgrading its Node runtime. See <code>docs/bob-setup.md</code> for first-time setup when Node is not installed yet.</p>
      </>}
    </div>
  );
}
