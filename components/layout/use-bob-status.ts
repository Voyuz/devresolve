"use client";
import { useEffect, useState } from "react";

export interface BobStatus { ready: boolean; reason: string | null; running: number; awaitingReview: number; untriaged: number; assignedToMe?: number }

const REFRESH_EVENT = "devresolve:status-changed";
/** Ask the sidebar/topbar counts to refresh now (after assigning, resolving, or reopening). */
export const refreshBobStatus = () => window.dispatchEvent(new Event(REFRESH_EVENT));

/** Server Bob readiness and developer to-do counts, refreshed every 30 seconds. */
export function useBobStatus() {
  const [status, setStatus] = useState<BobStatus | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch("/api/bob/status", { cache: "no-store", signal: controller.signal });
        if (response.ok) setStatus(await response.json());
      } catch { /* keep the last known status */ }
    }
    void load();
    const timer = setInterval(() => void load(), 30000);
    const refresh = () => void load();
    window.addEventListener(REFRESH_EVENT, refresh);
    return () => { controller.abort(); clearInterval(timer); window.removeEventListener(REFRESH_EVENT, refresh); };
  }, []);
  return status;
}
