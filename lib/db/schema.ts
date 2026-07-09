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
    userId: text("user_id"),
    event: text("event").notNull(),
    timestamp: timestamp("timestamp", { withTimezone: true }).notNull(),
    properties: jsonb("properties").$type<Record<string, unknown>>(),
  },
  (t) => ({
    byDistinct: index("posthog_event_distinct_idx").on(t.distinctId),
    byUser: index("posthog_event_user_idx").on(t.userId),
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
  totalSpentUsd: numeric("total_spent_usd", { precision: 14, scale: 2 }),
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

/** Aggregate RevenueCat metrics snapshot (from /metrics/overview). Single row per project. */
export const rcOverview = pgTable("rc_overview", {
  projectId: text("project_id").primaryKey(),
  activeTrials: integer("active_trials").default(0).notNull(),
  activeSubscriptions: integer("active_subscriptions").default(0).notNull(),
  mrr: numeric("mrr", { precision: 14, scale: 2 }),
  revenue28d: numeric("revenue_28d", { precision: 14, scale: 2 }),
  newCustomers28d: integer("new_customers_28d").default(0).notNull(),
  activeUsers28d: integer("active_users_28d").default(0).notNull(),
  raw: jsonb("raw").$type<Record<string, unknown>>(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

/** RevenueCat time-series snapshots from the Charts API. One row per chart name. */
export const rcChart = pgTable("rc_chart", {
  name: text("name").primaryKey(),
  unit: text("unit"),
  series: jsonb("series").$type<Array<{ date: string; value: number }>>(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Influencer / referral partner registry (mobile UTM attribution).
 * Coupon codes map a purchase back to the influencer that drove it; commission
 * rate drives the payout report. See docs/architecture/data-models.md.
 */
export const influencer = pgTable("influencer", {
  id: text("id").primaryKey(), // slug, e.g. "joao-silva"
  name: text("name").notNull(),
  handle: text("handle"), // @instagram / channel
  platform: text("platform"), // instagram | youtube | tiktok | other
  couponCodes: jsonb("coupon_codes").$type<string[]>().default([]).notNull(),
  commissionRate: numeric("commission_rate", { precision: 5, scale: 4 })
    .default("0.30")
    .notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Per-user acquisition attribution. Auto fields are extracted from the earliest
 * PostHog signals (UTMs, referrer, install/deep-link payloads, coupon codes);
 * manual fields are the audited override. On re-sync only the auto fields are
 * refreshed — manual attribution is never clobbered.
 */
export const userAttribution = pgTable(
  "user_attribution",
  {
    appUserId: text("app_user_id")
      .primaryKey()
      .references(() => appUser.id, { onDelete: "cascade" }),
    firstTouchAt: timestamp("first_touch_at", { withTimezone: true }),
    firstEvent: text("first_event"),
    // Auto-extracted first-touch signals (best-effort, may be null on mobile).
    autoSource: text("auto_source"),
    autoMedium: text("auto_medium"),
    autoCampaign: text("auto_campaign"),
    autoContent: text("auto_content"),
    autoTerm: text("auto_term"),
    autoReferrer: text("auto_referrer"),
    autoReferringDomain: text("auto_referring_domain"),
    autoUrl: text("auto_url"),
    autoNetwork: text("auto_network"), // mobile attribution network
    couponCode: text("coupon_code"), // from courtesy_applied
    signals: jsonb("signals").$type<Record<string, unknown>>(), // raw audit bag
    // Manual audit / override.
    manualInfluencerId: text("manual_influencer_id").references(() => influencer.id, {
      onDelete: "set null",
    }),
    manualSource: text("manual_source"), // freeform origin when no influencer row
    note: text("note"),
    attributedBy: text("attributed_by"),
    attributedAt: timestamp("attributed_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    byInfluencer: index("user_attribution_influencer_idx").on(t.manualInfluencerId),
    byCoupon: index("user_attribution_coupon_idx").on(t.couponCode),
  }),
);

export type AppUser = typeof appUser.$inferSelect;
export type PosthogEvent = typeof posthogEvent.$inferSelect;
export type RevenuecatTransaction = typeof revenuecatTransaction.$inferSelect;
export type SyncStateRow = typeof syncState.$inferSelect;
export type Influencer = typeof influencer.$inferSelect;
export type UserAttribution = typeof userAttribution.$inferSelect;

// Avoid unused import warning for primaryKey (kept for future composite keys)
void primaryKey;
