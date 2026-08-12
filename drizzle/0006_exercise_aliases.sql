-- Destructive reshape: per-user exercises + presentation on workout_exercise.
-- Existing workout/exercise/set data is cleared (aligned with local DB reset).

DELETE FROM "set";--> statement-breakpoint
DELETE FROM "workout_exercise";--> statement-breakpoint
DELETE FROM "exercise";--> statement-breakpoint
ALTER TABLE "exercise" DROP COLUMN IF EXISTS "video_url";--> statement-breakpoint
ALTER TABLE "exercise" DROP COLUMN IF EXISTS "image_url";--> statement-breakpoint
ALTER TABLE "exercise" DROP COLUMN IF EXISTS "meta_data";--> statement-breakpoint
ALTER TABLE "exercise" DROP COLUMN IF EXISTS "tags";--> statement-breakpoint
ALTER TABLE "exercise" ADD COLUMN "user_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "exercise" ADD CONSTRAINT "exercise_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "exercise_userId_idx" ON "exercise" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "workout_exercise" ADD COLUMN "name" text NOT NULL;--> statement-breakpoint
ALTER TABLE "workout_exercise" ADD COLUMN "video_url" text;--> statement-breakpoint
ALTER TABLE "workout_exercise" ADD COLUMN "image_url" text;--> statement-breakpoint
ALTER TABLE "workout_exercise" ADD COLUMN "meta_data" jsonb;--> statement-breakpoint
ALTER TABLE "workout_exercise" ADD COLUMN "tags" text[] DEFAULT '{}' NOT NULL;
