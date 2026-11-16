DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "accounts" GROUP BY lower("email") HAVING count(*) > 1) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'Resolve case-insensitive duplicate accounts.email values before migration 0012';
  END IF;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "accounts_email_lower_unique" ON "accounts" (lower("email"));
