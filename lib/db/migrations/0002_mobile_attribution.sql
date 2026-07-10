CREATE TABLE IF NOT EXISTS "influencer" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"handle" text,
	"platform" text,
	"coupon_codes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"commission_rate" numeric(5, 4) DEFAULT '0.30' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_attribution" (
	"app_user_id" text PRIMARY KEY NOT NULL,
	"first_touch_at" timestamp with time zone,
	"first_event" text,
	"auto_source" text,
	"auto_medium" text,
	"auto_campaign" text,
	"auto_content" text,
	"auto_term" text,
	"auto_referrer" text,
	"auto_referring_domain" text,
	"auto_url" text,
	"auto_network" text,
	"coupon_code" text,
	"signals" jsonb,
	"manual_influencer_id" text,
	"manual_source" text,
	"note" text,
	"attributed_by" text,
	"attributed_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_attribution" ADD CONSTRAINT "user_attribution_app_user_id_app_user_id_fk" FOREIGN KEY ("app_user_id") REFERENCES "app_user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_attribution" ADD CONSTRAINT "user_attribution_manual_influencer_id_influencer_id_fk" FOREIGN KEY ("manual_influencer_id") REFERENCES "influencer"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_attribution_influencer_idx" ON "user_attribution" ("manual_influencer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_attribution_coupon_idx" ON "user_attribution" ("coupon_code");
