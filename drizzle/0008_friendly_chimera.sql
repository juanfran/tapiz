ALTER TABLE "boards" ADD COLUMN "preview_updated_at" timestamp;--> statement-breakpoint
ALTER TABLE "boards" ADD COLUMN "preview_dirty" boolean DEFAULT false NOT NULL;
