WITH "normalized_accounts" AS (
  SELECT
    "id",
    CASE
      WHEN jsonb_typeof("settings"::jsonb) = 'object'
        THEN "settings"::jsonb
      WHEN jsonb_typeof("settings"::jsonb) = 'string'
        AND jsonb_typeof(("settings"::jsonb #>> '{}')::jsonb) = 'object'
        THEN ("settings"::jsonb #>> '{}')::jsonb
      ELSE '{"wheelInputMode":"auto","noteDefaults":{"backgroundColor":"#fbb980","textColor":"#000000","fontFamily":"\"Inter\", -apple-system, system-ui, sans-serif","bold":false,"italic":false}}'::jsonb
    END AS "settings"
  FROM "accounts"
), "backfilled_accounts" AS (
  SELECT
    "id",
    jsonb_set(
      "settings",
      '{wheelInputMode}',
      COALESCE("settings" -> 'wheelInputMode', '"auto"'::jsonb)
    ) AS "settings"
  FROM "normalized_accounts"
)
UPDATE "accounts"
SET "settings" = "backfilled_accounts"."settings"::json
FROM "backfilled_accounts"
WHERE "accounts"."id" = "backfilled_accounts"."id"
  AND "accounts"."settings"::jsonb IS DISTINCT FROM "backfilled_accounts"."settings";
--> statement-breakpoint
ALTER TABLE "accounts" ALTER COLUMN "settings" SET DEFAULT '{"wheelInputMode":"auto","noteDefaults":{"backgroundColor":"#fbb980","textColor":"#000000","fontFamily":"\"Inter\", -apple-system, system-ui, sans-serif","bold":false,"italic":false}}'::json;
