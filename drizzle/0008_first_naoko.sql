ALTER TABLE "spaces" ALTER COLUMN "team_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "settings" json DEFAULT '{"noteDefaults":{"backgroundColor":"#fbb980","textColor":"#000000","fontFamily":"\"Inter\", -apple-system, system-ui, sans-serif","bold":false,"italic":false}}'::json NOT NULL;
