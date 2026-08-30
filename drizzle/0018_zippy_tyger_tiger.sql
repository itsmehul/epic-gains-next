ALTER TABLE "import_prompt_feedback" ADD COLUMN "video_timestamp" double precision;--> statement-breakpoint
UPDATE "import_prompt_feedback" SET "video_timestamp" = 0 WHERE "video_timestamp" IS NULL;--> statement-breakpoint
ALTER TABLE "import_prompt_feedback" ALTER COLUMN "video_timestamp" SET NOT NULL;