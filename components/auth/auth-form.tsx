"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Bot, Loader2, LogIn, UserPlus, Zap } from "lucide-react";

// Only same-site paths are accepted as the post-login destination (prevents open redirects).
function safeNext(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\") ? value : null;
}

const inputCls =
  "w-full bg-white border border-zinc-200 rounded-xl px-4 h-11 text-sm text-slate-700 placeholder:text-zinc-300 focus:outline-none focus:border-[#5ec0ca] focus:ring-2 focus:ring-[#5ec0ca]/20 transition-all";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const isLogin = mode === "login";

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError("");
    if (!isLogin && password !== confirm) { setError("Passwords do not match."); return; }
    setBusy(true);
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, password }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Something went wrong.");
      // Full navigation so the new session cookie applies to every request.
      window.location.href = next ?? (body.user?.role === "developer" ? "/developer" : "/dashboard");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Something went wrong.");
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-3">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-[#5ec0ca] flex items-center justify-center shadow-lg shadow-[#5ec0ca]/30">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[#6287a2]">{isLogin ? "Sign in to DevResolve" : "Create your account"}</h1>
          <p className="text-sm text-slate-500">
            {isLogin ? "Report bugs and follow IBM Bob as it investigates and fixes them." : "New accounts can report issues. A developer role is granted by your team."}
          </p>
        </div>

        <form onSubmit={submit} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-7 space-y-5">
          <label className="block space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Username</span>
            <input className={inputCls} value={name} onChange={event => setName(event.target.value)} autoComplete="username"
              required minLength={3} maxLength={50} autoFocus disabled={busy} />
          </label>
          <label className="block space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Password</span>
            <input className={inputCls} type="password" value={password} onChange={event => setPassword(event.target.value)}
              autoComplete={isLogin ? "current-password" : "new-password"} required minLength={6} maxLength={100} disabled={busy} />
          </label>
          {!isLogin && (
            <label className="block space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Confirm password</span>
              <input className={inputCls} type="password" value={confirm} onChange={event => setConfirm(event.target.value)}
                autoComplete="new-password" required minLength={6} maxLength={100} disabled={busy} />
            </label>
          )}

          {error && <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}

          <button type="submit" disabled={busy}
            className="w-full h-11 rounded-xl bg-[#5ec0ca] hover:bg-[#4baab4] text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-60">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : isLogin ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
            {isLogin ? "Sign in" : "Create account"}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500">
          {isLogin ? "No account yet? " : "Already have an account? "}
          <Link href={`/auth/${isLogin ? "register" : "login"}${next ? `?next=${encodeURIComponent(next)}` : ""}`}
            className="font-semibold text-[#449199] hover:underline">
            {isLogin ? "Create one" : "Sign in"}
          </Link>
        </p>
        <p className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
          <Bot className="w-3.5 h-3.5 text-[#5ec0ca]" /> DevResolve · IBM Bob 2.0 Hackathon
        </p>
      </div>
    </main>
  );
}
