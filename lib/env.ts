import { z } from "zod";

/**
 * Server-side environment validation (NFR2/NFR3).
 * Never import this from a client component.
 */
const serverEnvSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  AUTH_SECRET: z.string().min(1, "AUTH_SECRET is required"),
  AUTH_URL: z.string().url().optional(),

  // Single admin login (email + password).
  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_PASSWORD: z.string().optional(),

  POSTHOG_API_KEY: z.string().optional(),
  POSTHOG_PROJECT_ID: z.string().optional(),
  POSTHOG_BASE_URL: z.string().url().default("https://us.posthog.com"),

  REVENUECAT_API_KEY: z.string().optional(),
  REVENUECAT_PROJECT_ID: z.string().optional(),
  REVENUECAT_BASE_URL: z.string().url().default("https://api.revenuecat.com"),

  CRON_SECRET: z.string().optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | null = null;

/**
 * Parse and cache env. Throws a readable error if required vars are missing.
 * Lazy so that build-time (without secrets) does not crash unrelated pages.
 */
export function getEnv(): ServerEnv {
  if (cached) return cached;
  const parsed = serverEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment variables:\n${issues}`);
  }
  cached = parsed.data;
  return cached;
}
