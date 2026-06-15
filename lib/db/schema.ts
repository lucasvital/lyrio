import {
  pgTable,
  text,
  timestamp,
  jsonb,
  integer,
  numeric,
  boolean,
  primaryKey,
  index,
} from "drizzle-orm/pg-core";

/**
 * Canonical identity anchor. id == PostHog distinct_id == RevenueCat app_user_id
 * (locked decision). See docs/architecture/data-models.md.
 */
export const appUser = pgTable("app_user", {
  id: text("id").primaryKey(),
  email: text("email"),
  firstSeenAt: timestamp("first_seen_at", { withTimezone: true }),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const posthogPerson = pgTable("posthog_person", {
  distinctId: text("distinct_id")
    .primaryKey()
    .references(() => appUser.id, { onDelete: "cascade" }),
  email: text("email"),
  properties: jsonb("properties").$type<Record<string, unknown>>(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const posthogEvent = pgTable(
  "posthog_event",
  {
    eventId: text("event_id").primaryKey(),
    distinctId: text("distinct_id").notNull(),
    event: text("event").notNull(),
    timestamp: timestamp("timestamp", { withTimezone: true }).notNull(),
    properties: jsonb("properties").$type<Record<string, unknown>>(),
  },
  (t) => ({
    byDistinct: index("posthog_event_distinct_idx").on(t.distinctId),
    byTime: index("posthog_event_time_idx").on(t.timestamp),
    byEvent: index("posthog_event_event_idx").on(t.event),
  }),
);

export const revenuecatSubscriber = pgTable("revenuecat_subscriber", {
  appUserId: text("app_user_id")
    .primaryKey()
    .references(() => appUser.id, { onDelete: "cascade" }),
  email: text("email"),
  activeEntitlements: jsonb("active_entitlements").$type<string[]>(),
  isActive: boolean("is_active").default(false).notNull(),
  originalPurchaseAt: timestamp("original_purchase_at", { withTimezone: true }),
  raw: jsonb("raw").$type<Record<string, unknown>>(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const revenuecatTransaction = pgTable(
  "revenuecat_transaction",
  {
    transactionId: text("transaction_id").primaryKey(),
    appUserId: text("app_user_id").notNull(),
    productId: text("product_id"),
    store: text("store"),
    type: text("type"),
    priceUsd: numeric("price_usd", { precision: 12, scale: 4 }),
    currency: text("currency"),
    purchasedAt: timestamp("purchased_at", { withTimezone: true }).notNull(),
    raw: jsonb("raw").$type<Record<string, unknown>>(),
  },
  (t) => ({
    byUser: index("rc_tx_user_idx").on(t.appUserId),
    byTime: index("rc_tx_time_idx").on(t.purchasedAt),
  }),
);

/** Incremental sync checkpoints. See docs/architecture/backend-architecture.md. */
export const syncState = pgTable("sync_state", {
  source: text("source").primaryKey(),
  cursor: text("cursor"),
  lastRunAt: timestamp("last_run_at", { withTimezone: true }),
  status: text("status", { enum: ["ok", "error", "running"] }),
  error: text("error"),
  ingestedTotal: integer("ingested_total").default(0).notNull(),
});

export type AppUser = typeof appUser.$inferSelect;
export type PosthogEvent = typeof posthogEvent.$inferSelect;
export type RevenuecatTransaction = typeof revenuecatTransaction.$inferSelect;
export type SyncStateRow = typeof syncState.$inferSelect;

// Avoid unused import warning for primaryKey (kept for future composite keys)
void primaryKey;
