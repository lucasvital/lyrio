ALTER TABLE "user_attribution" ADD COLUMN IF NOT EXISTS "environment" text;--> statement-breakpoint
ALTER TABLE "user_attribution" ADD COLUMN IF NOT EXISTS "is_sandbox" boolean DEFAULT false NOT NULL;
