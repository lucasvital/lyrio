CREATE TABLE "rc_chart" (
	"name" text PRIMARY KEY NOT NULL,
	"unit" text,
	"series" jsonb,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rc_overview" (
	"project_id" text PRIMARY KEY NOT NULL,
	"active_trials" integer DEFAULT 0 NOT NULL,
	"active_subscriptions" integer DEFAULT 0 NOT NULL,
	"mrr" numeric(14, 2),
	"revenue_28d" numeric(14, 2),
	"new_customers_28d" integer DEFAULT 0 NOT NULL,
	"active_users_28d" integer DEFAULT 0 NOT NULL,
	"raw" jsonb,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "posthog_event" ADD COLUMN "user_id" text;--> statement-breakpoint
ALTER TABLE "revenuecat_subscriber" ADD COLUMN "total_spent_usd" numeric(14, 2);--> statement-breakpoint
CREATE INDEX "posthog_event_user_idx" ON "posthog_event" USING btree ("user_id");