import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";

// Access rules for the profiles-table login:
// - every page and API requires a session, except the auth pages and /api/auth/*;
// - developer pages and developer actions (running Bob, triage, reviews) require role "developer".
// Sensitive route handlers re-check the role themselves (see requireRole in lib/auth/session.ts).

const AUTH_PAGES = ["/auth/login", "/auth/register"];
const DEVELOPER_PAGES = /^\/(developer|bob-test)(\/|$)/;

function isDeveloperApi(path: string, method: string) {
  return (path === "/api/bob/resolve" && method === "POST")
    || /^\/api\/bob\/jobs\//.test(path)
    || /^\/api\/issues\/[^/]+\/triage$/.test(path)
    || (/^\/api\/issues\/[^/]+$/.test(path) && method === "PATCH");
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const session = verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  const home = session?.role === "developer" ? "/developer" : "/dashboard";

  if (pathname.startsWith("/api/")) {
    if (pathname.startsWith("/api/auth/")) return NextResponse.next();
    if (!session) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    if (isDeveloperApi(pathname, request.method) && session.role !== "developer") {
      return NextResponse.json({ error: "Developer access required." }, { status: 403 });
    }
    return NextResponse.next();
  }

  if (AUTH_PAGES.includes(pathname)) return session ? NextResponse.redirect(new URL(home, request.url)) : NextResponse.next();
  if (!session) {
    const login = new URL("/auth/login", request.url);
    if (pathname !== "/") login.searchParams.set("next", pathname + search);
    return NextResponse.redirect(login);
  }
  if (pathname === "/") return NextResponse.redirect(new URL(home, request.url));
  if (DEVELOPER_PAGES.test(pathname) && session.role !== "developer") return NextResponse.redirect(new URL("/dashboard", request.url));
  return NextResponse.next();
}

export const config = {
  // Skip Next.js internals and static files (anything with a file extension).
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.[A-Za-z0-9]+$).*)"],
};
