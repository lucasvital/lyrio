import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe auth config (no providers, no Node-only deps). Imported by the
 * middleware so the Edge bundle never pulls in bcrypt/db. The full config with
 * the Credentials provider lives in `lib/auth.ts`.
 */
export const authConfig = {
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const { pathname } = nextUrl;
      const isPublic =
        pathname === "/login" ||
        pathname.startsWith("/api/auth") ||
        pathname === "/api/health" ||
        pathname.startsWith("/api/sync") || // guarded by CRON_SECRET instead
        pathname.startsWith("/api/webhooks"); // external webhooks (Kiwify)

      if (isPublic) return true;
      return !!auth?.user; // false → redirect to signIn page
    },
  },
} satisfies NextAuthConfig;
