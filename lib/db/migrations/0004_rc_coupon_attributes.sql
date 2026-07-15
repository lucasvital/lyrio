ALTER TABLE "revenuecat_subscriber" ADD COLUMN IF NOT EXISTS "coupon_code" text;--> statement-breakpoint
ALTER TABLE "revenuecat_subscriber" ADD COLUMN IF NOT EXISTS "attributes" jsonb;
