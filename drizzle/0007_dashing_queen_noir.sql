ALTER TABLE "workout_exercise" DROP CONSTRAINT "workout_exercise_workout_id_exercise_id_pk";--> statement-breakpoint
ALTER TABLE "workout_exercise" ADD COLUMN "id" text;--> statement-breakpoint
UPDATE "workout_exercise" SET "id" = gen_random_uuid()::text WHERE "id" IS NULL;--> statement-breakpoint
ALTER TABLE "workout_exercise" ALTER COLUMN "id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "workout_exercise" ADD PRIMARY KEY ("id");
