import { timingSafeEqual } from "node:crypto";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { getEnv } from "@/lib/env";
import { authConfig } from "./auth.config";

/**
 * Auth.js (NextAuth v5) — single admin login from env (ADMIN_EMAIL +
 * ADMIN_PASSWORD). No database involved. Secrets via env (NFR2).
 */
const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

/** Constant-time string comparison (avoids timing attacks). */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        const env = getEnv();
        if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) return null;

        const emailOk = safeEqual(
          email.trim().toLowerCase(),
          env.ADMIN_EMAIL.trim().toLowerCase(),
        );
        const passwordOk = safeEqual(password, env.ADMIN_PASSWORD);
        if (!emailOk || !passwordOk) return null;

        return { id: "admin", email: env.ADMIN_EMAIL, name: "Admin" };
      },
    }),
  ],
});
