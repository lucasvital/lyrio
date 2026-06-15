import { auth } from "@/lib/auth";

/**
 * Route guard (Story 1.4 / FR2). Unauthenticated users hitting protected
 * routes are redirected to /login. Public: /login, /api/auth/*, /api/health.
 */
export default auth((req) => {
  const { pathname } = req.nextUrl;

  const isPublic =
    pathname === "/login" ||
    pathname.startsWith("/api/auth") ||
    pathname === "/api/health" ||
    pathname.startsWith("/api/sync"); // guarded by CRON_SECRET instead

  if (isPublic) return;

  if (!req.auth) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return Response.redirect(loginUrl);
  }
});

export const config = {
  // Run on everything except static assets.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
