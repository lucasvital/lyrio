CREATE TABLE "app_user" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text,
	"first_seen_at" timestamp with time zone,
	"last_seen_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "posthog_event" (
	"event_id" text PRIMARY KEY NOT NULL,
	"distinct_id" text NOT NULL,
	"event" text NOT NULL,
	"timestamp" timestamp with time zone NOT NULL,
	"properties" jsonb
);
--> statement-breakpoint
CREATE TABLE "posthog_person" (
	"distinct_id" text PRIMARY KEY NOT NULL,
	"email" text,
	"properties" jsonb,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "revenuecat_subscriber" (
	"app_user_id" text PRIMARY KEY NOT NULL,
	"email" text,
	"active_entitlements" jsonb,
	"is_active" boolean DEFAULT false NOT NULL,
	"original_purchase_at" timestamp with time zone,
	"raw" jsonb,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "revenuecat_transaction" (
	"transaction_id" text PRIMARY KEY NOT NULL,
	"app_user_id" text NOT NULL,
	"product_id" text,
	"store" text,
	"type" text,
	"price_usd" numeric(12, 4),
	"currency" text,
	"purchased_at" timestamp with time zone NOT NULL,
	"raw" jsonb
);
--> statement-breakpoint
CREATE TABLE "sync_state" (
	"source" text PRIMARY KEY NOT NULL,
	"cursor" text,
	"last_run_at" timestamp with time zone,
	"status" text,
	"error" text,
	"ingested_total" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "posthog_person" ADD CONSTRAINT "posthog_person_distinct_id_app_user_id_fk" FOREIGN KEY ("distinct_id") REFERENCES "public"."app_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revenuecat_subscriber" ADD CONSTRAINT "revenuecat_subscriber_app_user_id_app_user_id_fk" FOREIGN KEY ("app_user_id") REFERENCES "public"."app_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "posthog_event_distinct_idx" ON "posthog_event" USING btree ("distinct_id");--> statement-breakpoint
CREATE INDEX "posthog_event_time_idx" ON "posthog_event" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "posthog_event_event_idx" ON "posthog_event" USING btree ("event");--> statement-breakpoint
CREATE INDEX "rc_tx_user_idx" ON "revenuecat_transaction" USING btree ("app_user_id");--> statement-breakpoint
CREATE INDEX "rc_tx_time_idx" ON "revenuecat_transaction" USING btree ("purchased_at");