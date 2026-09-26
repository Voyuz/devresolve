import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "devresolve_session";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Route yang tidak memerlukan auth
  const publicRoutes = ["/", "/auth/login", "/auth/register", "/api/auth"];
  const isPublic =
    publicRoutes.some((r) => pathname === r || pathname.startsWith(r + "/")) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon");

  const session = request.cookies.get(SESSION_COOKIE)?.value;
  const isLoggedIn = !!session;

  if (!isLoggedIn && !isPublic) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/auth/login";
    return NextResponse.redirect(loginUrl);
  }

  // Jika sudah login dan mencoba akses /auth/login, redirect ke dashboard
  if (isLoggedIn && pathname.startsWith("/auth/")) {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = "/dashboard";
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
