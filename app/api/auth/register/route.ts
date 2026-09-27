import { NextResponse } from "next/server";
import { createProfile, validateCredentials } from "@/lib/auth/profiles";
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/session";

export const runtime = "nodejs";

// POST /api/auth/register — { name, password } → creates a "user" profile and signs in.
export async function POST(request: Request) {
  let credentials;
  try { credentials = validateCredentials(await request.json()); }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Invalid details." }, { status: 400 }); }
  try {
    const profile = await createProfile(credentials.name, credentials.password);
    const response = NextResponse.json({ user: profile }, { status: 201 });
    response.cookies.set(SESSION_COOKIE, createSessionToken(profile), sessionCookieOptions);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Registration failed.";
    return Response.json({ error: message }, { status: message.includes("taken") ? 409 : 503 });
  }
}
