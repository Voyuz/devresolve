"use client";
import { useEffect, useState } from "react";
import type { AppRole } from "@/types/issues";

export interface SessionUser { id: string; name: string; role: AppRole }

/** The signed-in profile from /api/auth/me (undefined while loading, null when signed out). */
export function useSession() {
  const [user, setUser] = useState<SessionUser | null | undefined>(undefined);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/auth/me", { cache: "no-store", signal: controller.signal })
      .then(async response => setUser(response.ok ? (await response.json()).user : null))
      .catch(() => { if (!controller.signal.aborted) setUser(null); });
    return () => controller.abort();
  }, []);
  return user;
}

export async function signOut(router: { replace: (href: string) => void; refresh: () => void }) {
  await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
  router.replace("/auth/login");
  router.refresh();
}
