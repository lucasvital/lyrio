CREATE TABLE "kiwify_event" (
	"id" text PRIMARY KEY NOT NULL,
	"project" text NOT NULL,
	"event_type" text,
	"order_id" text,
	"subscription_id" text,
	"payload" jsonb,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kiwify_subscription" (
	"subscription_id" text PRIMARY KEY NOT NULL,
	"project" text NOT NULL,
	"status" text,
	"customer_email" text,
	"customer_name" text,
	"product_id" text,
	"product_name" text,
	"plan" text,
	"amount" numeric(14, 2),
	"currency" text,
	"started_at" timestamp with time zone,
	"next_charge_at" timestamp with time zone,
	"canceled_at" timestamp with time zone,
	"raw" jsonb,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "kiwify_event_project_idx" ON "kiwify_event" USING btree ("project");--> statement-breakpoint
CREATE INDEX "kiwify_event_time_idx" ON "kiwify_event" USING btree ("received_at");--> statement-breakpoint
CREATE INDEX "kiwify_sub_project_idx" ON "kiwify_subscription" USING btree ("project");--> statement-breakpoint
CREATE INDEX "kiwify_sub_status_idx" ON "kiwify_subscription" USING btree ("status");