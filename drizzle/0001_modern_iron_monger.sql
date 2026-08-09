CREATE TABLE "exercise" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"video_url" text,
	"image_url" text,
	"meta_data" jsonb,
	"tags" text[] DEFAULT '{}' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "set" (
	"id" text PRIMARY KEY NOT NULL,
	"reps" integer,
	"weight" double precision,
	"time" double precision,
	"distance" double precision,
	"workout_id" text NOT NULL,
	"exercise_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workout" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workout_exercise" (
	"workout_id" text NOT NULL,
	"exercise_id" text NOT NULL,
	CONSTRAINT "workout_exercise_workout_id_exercise_id_pk" PRIMARY KEY("workout_id","exercise_id")
);
--> statement-breakpoint
ALTER TABLE "set" ADD CONSTRAINT "set_workout_id_fk" FOREIGN KEY ("workout_id") REFERENCES "public"."workout"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "set" ADD CONSTRAINT "set_exercise_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercise"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_exercise" ADD CONSTRAINT "workout_exercise_workout_id_fk" FOREIGN KEY ("workout_id") REFERENCES "public"."workout"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_exercise" ADD CONSTRAINT "workout_exercise_exercise_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercise"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "set_workoutId_idx" ON "set" USING btree ("workout_id");--> statement-breakpoint
CREATE INDEX "set_exerciseId_idx" ON "set" USING btree ("exercise_id");--> statement-breakpoint
CREATE INDEX "set_workoutId_exerciseId_idx" ON "set" USING btree ("workout_id","exercise_id");--> statement-breakpoint
CREATE INDEX "workout_exercise_workoutId_idx" ON "workout_exercise" USING btree ("workout_id");--> statement-breakpoint
CREATE INDEX "workout_exercise_exerciseId_idx" ON "workout_exercise" USING btree ("exercise_id");