CREATE TABLE IF NOT EXISTS "oidc_identities" (
	"issuer" varchar NOT NULL,
	"subject" varchar NOT NULL,
	"account_id" varchar(256) NOT NULL,
	CONSTRAINT oidc_identities_issuer_subject PRIMARY KEY("issuer","subject")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "oidc_identities" ADD CONSTRAINT "oidc_identities_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
