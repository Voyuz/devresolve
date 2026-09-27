import { NextResponse } from "next/server";
import { findProfileForLogin, validateCredentials } from "@/lib/auth/profiles";
import { clearFailures, isLimited, recordFailure } from "@/lib/auth/rate-limit";
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/session";

export const runtime = "nodejs";

// POST /api/auth/login — { name, password } → sets the session cookie.
export async function POST(request: Request) {
  let credentials;
  try { credentials = validateCredentials(await request.json()); }
  catch { return Response.json({ error: "Invalid username or password." }, { status: 400 }); }
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const keys = [`name:${credentials.name.toLowerCase()}`, `ip:${ip}`];
  if (keys.some(key => isLimited(key))) return Response.json({ error: "Too many attempts. Wait a minute and try again." }, { status: 429 });
  try {
    const profile = await findProfileForLogin(credentials.name, credentials.password);
    if (!profile) {
      keys.forEach(key => recordFailure(key));
      return Response.json({ error: "Invalid username or password." }, { status: 401 });
    }
    keys.forEach(clearFailures);
    const response = NextResponse.json({ user: profile });
    response.cookies.set(SESSION_COOKIE, createSessionToken(profile), sessionCookieOptions);
    return response;
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Sign-in failed." }, { status: 503 });
  }
}
