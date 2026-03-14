CREATE TABLE "oauth_accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" varchar NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "account_session" DROP CONSTRAINT "account_session_user_id_accounts_id_fk";
--> statement-breakpoint
ALTER TABLE "accounts_boards" DROP CONSTRAINT "accounts_boards_account_id_board_id";--> statement-breakpoint
ALTER TABLE "space_boards" DROP CONSTRAINT "space_boards_space_id_board_id";--> statement-breakpoint
ALTER TABLE "starreds" DROP CONSTRAINT "starreds_account_id_board_id";--> statement-breakpoint
ALTER TABLE "team_members" DROP CONSTRAINT "team_members_team_id_account_id";--> statement-breakpoint
ALTER TABLE "account_session" ALTER COLUMN "id" SET DATA TYPE text;--> statement-breakpoint
-- Clear old Lucia sessions: Better Auth uses a different session format.
-- Existing users will need to re-authenticate once after this migration.
DELETE FROM "account_session";--> statement-breakpoint
-- Populate oauth_accounts from existing accounts.google_id for smooth transition.
-- After this migration, Google OAuth links are stored in oauth_accounts.
INSERT INTO "oauth_accounts" ("id", "account_id", "provider_id", "user_id", "created_at", "updated_at")
SELECT gen_random_uuid()::text, google_id, 'google', id, now(), now()
FROM "accounts"
WHERE google_id IS NOT NULL;--> statement-breakpoint
ALTER TABLE "spaces" ALTER COLUMN "team_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "accounts_boards" ADD CONSTRAINT "accounts_boards_account_id_board_id_pk" PRIMARY KEY("account_id","board_id");--> statement-breakpoint
ALTER TABLE "space_boards" ADD CONSTRAINT "space_boards_space_id_board_id_pk" PRIMARY KEY("space_id","board_id");--> statement-breakpoint
ALTER TABLE "starreds" ADD CONSTRAINT "starreds_account_id_board_id_pk" PRIMARY KEY("account_id","board_id");--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_team_id_account_id_pk" PRIMARY KEY("team_id","account_id");--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "email_verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
-- Sessions were cleared above; these columns are safe to add as NOT NULL now.
ALTER TABLE "account_session" ADD COLUMN "token" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "account_session" ALTER COLUMN "token" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "account_session" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "account_session" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "account_session" ADD COLUMN "ip_address" text;--> statement-breakpoint
ALTER TABLE "account_session" ADD COLUMN "user_agent" text;--> statement-breakpoint
ALTER TABLE "oauth_accounts" ADD CONSTRAINT "oauth_accounts_user_id_accounts_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_session" ADD CONSTRAINT "account_session_user_id_accounts_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_session" ADD CONSTRAINT "account_session_token_unique" UNIQUE("token");