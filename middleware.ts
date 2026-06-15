import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

/**
 * Route guard (Story 1.4 / FR2). Uses the edge-safe config only; the
 * `authorized` callback decides access and redirects to /login.
 */
export default NextAuth(authConfig).auth;

export const config = {
  // Run on everything except static assets.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
