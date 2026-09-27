"use client";

import React, { useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const inputCls =
  "w-full bg-white border border-zinc-200 rounded-xl px-4 h-11 text-sm text-slate-700 placeholder:text-zinc-300 focus:outline-none focus:border-[#5ec0ca] focus:ring-2 focus:ring-[#5ec0ca]/20 transition-all";

/** Registers a GitHub repository as a project owned by the signed-in profile. */
export function AddProjectDialog({ onCreated, label = "Add project" }: { onCreated: () => void; label?: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [branch, setBranch] = useState("main");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function reset() { setName(""); setRepoUrl(""); setBranch("main"); setError(""); }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;
    setSaving(true); setError("");
    try {
      const response = await fetch("/api/projects", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, repoUrl, defaultBranch: branch }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Cannot save the project.");
      setOpen(false); reset(); onCreated();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Cannot save the project.");
    } finally { setSaving(false); }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} className="bg-[#5ec0ca] hover:bg-[#4baab4] text-white font-bold border-0 gap-1.5">
        <Plus className="w-4 h-4" /> {label}
      </Button>
      <Dialog open={open} onOpenChange={next => { setOpen(next); if (!next) reset(); }}>
        <DialogContent className="sm:max-w-lg bg-white border-slate-200 rounded-2xl p-0 overflow-hidden">
          <form onSubmit={submit}>
            <DialogHeader className="p-6 border-b border-slate-100">
              <DialogTitle className="text-[#6287a2] font-bold">Add a project</DialogTitle>
              <DialogDescription className="text-slate-500 text-sm">
                Register a GitHub repository. Only you (and developers) will see it. IBM Bob works on the branch you choose.
              </DialogDescription>
            </DialogHeader>
            <div className="p-6 space-y-4">
              <label className="block space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Project name</span>
                <input className={inputCls} value={name} onChange={event => setName(event.target.value)} required minLength={2} maxLength={100}
                  placeholder="Mini Shop" disabled={saving} autoFocus />
              </label>
              <label className="block space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">GitHub repository URL</span>
                <input className={inputCls} value={repoUrl} onChange={event => setRepoUrl(event.target.value)} required type="url"
                  placeholder="https://github.com/owner/repo" disabled={saving} />
              </label>
              <label className="block space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Branch</span>
                <input className={inputCls} value={branch} onChange={event => setBranch(event.target.value)} required maxLength={100}
                  placeholder="main" disabled={saving} />
              </label>
              {error && <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}
            </div>
            <DialogFooter className="p-5 border-t border-slate-100 bg-slate-50/60">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
              <Button type="submit" disabled={saving} className="bg-[#5ec0ca] hover:bg-[#4baab4] text-white font-bold border-0 gap-1.5">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {saving ? "Checking GitHub..." : "Add project"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
