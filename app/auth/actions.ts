"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { findProfileForLogin, validateCredentials } from "@/lib/auth/profiles";
import { clearFailures, isLimited, recordFailure } from "@/lib/auth/rate-limit";
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions, verifySessionToken } from "@/lib/auth/session";
import type { SessionUser } from "@/types/issues";

// Server actions used by main's login page and top bar. The session is the signed cookie from
// lib/auth/session.ts (the same one proxy.ts and the API routes verify), not a plain JSON cookie.

// Keep the requested destination across failed attempts.
const loginError = (message: string, next: string | null = null) =>
  redirect(`/auth/login?error=${encodeURIComponent(message)}${next ? `&next=${encodeURIComponent(next)}` : ""}`);

// Only same-site paths are accepted as the post-login destination (prevents open redirects).
const safeNext = (value: FormDataEntryValue | null) =>
  typeof value === "string" && value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\") ? value : null;

export async function signIn(formData: FormData) {
  const next = safeNext(formData.get("next"));
  let credentials;
  try {
    credentials = validateCredentials({ name: formData.get("namaUser"), password: formData.get("sandiUser") });
  } catch {
    loginError("Invalid username or password", next);
  }
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const keys = [`name:${credentials!.name.toLowerCase()}`, `ip:${ip}`];
  if (keys.some(key => isLimited(key))) loginError("Too many attempts. Wait a minute and try again", next);

  const profile = await findProfileForLogin(credentials!.name, credentials!.password).catch(() => undefined);
  if (profile === undefined) loginError("Cannot reach the account store. Try again", next);
  // One message for unknown users and wrong passwords, so usernames cannot be probed.
  if (!profile) {
    keys.forEach(key => recordFailure(key));
    loginError("Invalid username or password", next);
  }
  keys.forEach(clearFailures);

  (await cookies()).set(SESSION_COOKIE, createSessionToken(profile!), sessionCookieOptions);
  redirect(next ?? (profile!.role === "developer" ? "/developer" : "/dashboard"));
}

export async function signOut() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/auth/login");
}

export async function getSession(): Promise<SessionUser | null> {
  const session = verifySessionToken((await cookies()).get(SESSION_COOKIE)?.value);
  return session ? { id: Number(session.id), NamaUser: session.name, role: session.role } : null;
}
