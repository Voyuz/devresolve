// Signed session cookie for the profiles-table login (no Supabase Auth).
// Used by proxy.ts and route handlers; server-side only (reads secrets from the environment).
import { createHmac, timingSafeEqual } from "node:crypto";
import type { AppRole } from "../../types/issues";

export const SESSION_COOKIE = "devresolve_session";
export const SESSION_MAX_AGE = 7 * 24 * 60 * 60; // seconds

export interface Session { id: string; name: string; role: AppRole; exp: number }

function secret() {
  // Prefer a dedicated secret; otherwise derive one from the server-only service key so no new setup is required.
  const dedicated = process.env.DEVRESOLVE_SESSION_SECRET;
  if (dedicated && dedicated.length >= 32) return dedicated;
  const base = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base) throw new Error("Configure DEVRESOLVE_SESSION_SECRET (32+ characters) or SUPABASE_SERVICE_ROLE_KEY.");
  return createHmac("sha256", base).update("devresolve-session-v1").digest("hex");
}

const sign = (payload: string) => createHmac("sha256", secret()).update(payload).digest("base64url");

export function createSessionToken(user: { id: string; name: string; role: AppRole }, now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({ ...user, exp: Math.floor(now / 1000) + SESSION_MAX_AGE })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: string | undefined | null, now = Date.now()): Session | null {
  if (!token || token.length > 2000) return null;
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra !== undefined) return null;
  let expected: string;
  try { expected = sign(payload); } catch { return null; }
  const a = Buffer.from(signature), b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Session;
    if (typeof session.id !== "string" || typeof session.name !== "string" || !["user", "developer"].includes(session.role)) return null;
    if (typeof session.exp !== "number" || session.exp * 1000 <= now) return null;
    return session;
  } catch { return null; }
}

/** Reads the session from a Request's Cookie header (route handlers). */
export function sessionFromRequest(request: Request): Session | null {
  const cookie = request.headers.get("cookie") ?? "";
  const match = cookie.split(/;\s*/).find(part => part.startsWith(`${SESSION_COOKIE}=`));
  return verifySessionToken(match ? decodeURIComponent(match.slice(SESSION_COOKIE.length + 1)) : null);
}

export const sessionCookieOptions = {
  httpOnly: true, sameSite: "lax" as const, path: "/", maxAge: SESSION_MAX_AGE,
  secure: process.env.NODE_ENV === "production",
};

/** Route-handler guard: returns an error Response when the caller lacks the role, otherwise null. */
export function requireRole(request: Request, role?: AppRole): Response | null {
  const session = sessionFromRequest(request);
  if (!session) return Response.json({ error: "Sign in required." }, { status: 401 });
  if (role && session.role !== role) return Response.json({ error: "Developer access required." }, { status: 403 });
  return null;
}
