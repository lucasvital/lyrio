import { sql } from "drizzle-orm";
import { db } from "./client";

/**
 * Idempotent schema bootstrap (CREATE TABLE IF NOT EXISTS), mirroring
 * lib/db/migrations/0000_*.sql. Runs automatically at the start of each sync so
 * the app works on serverless (Vercel) without a separate `db:migrate` step.
 */
const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS "app_user" (
    "id" text PRIMARY KEY NOT NULL,
    "email" text,
    "first_seen_at" timestamp with time zone,
    "last_seen_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS "posthog_person" (
    "distinct_id" text PRIMARY KEY NOT NULL REFERENCES "app_user"("id") ON DELETE CASCADE,
    "email" text,
    "properties" jsonb,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS "posthog_event" (
    "event_id" text PRIMARY KEY NOT NULL,
    "distinct_id" text NOT NULL,
    "event" text NOT NULL,
    "timestamp" timestamp with time zone NOT NULL,
    "properties" jsonb
  )`,
  `CREATE TABLE IF NOT EXISTS "revenuecat_subscriber" (
    "app_user_id" text PRIMARY KEY NOT NULL REFERENCES "app_user"("id") ON DELETE CASCADE,
    "email" text,
    "active_entitlements" jsonb,
    "is_active" boolean DEFAULT false NOT NULL,
    "original_purchase_at" timestamp with time zone,
    "raw" jsonb,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS "revenuecat_transaction" (
    "transaction_id" text PRIMARY KEY NOT NULL,
    "app_user_id" text NOT NULL,
    "product_id" text,
    "store" text,
    "type" text,
    "price_usd" numeric(12, 4),
    "currency" text,
    "purchased_at" timestamp with time zone NOT NULL,
    "raw" jsonb
  )`,
  `CREATE TABLE IF NOT EXISTS "sync_state" (
    "source" text PRIMARY KEY NOT NULL,
    "cursor" text,
    "last_run_at" timestamp with time zone,
    "status" text,
    "error" text,
    "ingested_total" integer DEFAULT 0 NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS "posthog_event_distinct_idx" ON "posthog_event" ("distinct_id")`,
  `CREATE INDEX IF NOT EXISTS "posthog_event_time_idx" ON "posthog_event" ("timestamp")`,
  `CREATE INDEX IF NOT EXISTS "posthog_event_event_idx" ON "posthog_event" ("event")`,
  `CREATE INDEX IF NOT EXISTS "rc_tx_user_idx" ON "revenuecat_transaction" ("app_user_id")`,
  `CREATE INDEX IF NOT EXISTS "rc_tx_time_idx" ON "revenuecat_transaction" ("purchased_at")`,
];

let ensured = false;

export async function ensureSchema(force = false): Promise<void> {
  if (ensured && !force) return;
  for (const stmt of STATEMENTS) {
    await db.execute(sql.raw(stmt));
  }
  ensured = true;
}
