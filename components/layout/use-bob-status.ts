"use client";
import { useEffect, useState } from "react";

export interface BobStatus { ready: boolean; reason: string | null; running: number; awaitingReview: number; untriaged: number }

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
    return () => { controller.abort(); clearInterval(timer); };
  }, []);
  return status;
}
