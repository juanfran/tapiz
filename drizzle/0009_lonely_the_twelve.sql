ALTER TABLE "accounts" ADD COLUMN "api_token_hash" varchar(64);--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "api_token_created_at" timestamp;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_api_token_hash_unique" UNIQUE("api_token_hash");
