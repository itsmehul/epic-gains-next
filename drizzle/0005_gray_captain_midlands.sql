ALTER TABLE "set" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
UPDATE "set" AS s
SET "created_at" = w."created_at"
FROM "workout" AS w
WHERE s."workout_id" = w."id";--> statement-breakpoint
CREATE INDEX "set_createdAt_idx" ON "set" USING btree ("created_at");
