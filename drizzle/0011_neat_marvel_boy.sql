CREATE TABLE "comments" (
	"id" text PRIMARY KEY NOT NULL,
	"exercise_id" text NOT NULL,
	"workout_id" text,
	"text" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"author_id" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_exercise_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercise"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_workout_id_fk" FOREIGN KEY ("workout_id") REFERENCES "public"."workout"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "comments_exerciseId_idx" ON "comments" USING btree ("exercise_id");--> statement-breakpoint
CREATE INDEX "comments_workoutId_idx" ON "comments" USING btree ("workout_id");--> statement-breakpoint
CREATE INDEX "comments_authorId_idx" ON "comments" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "comments_createdAt_idx" ON "comments" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "comments_exerciseId_workoutId_idx" ON "comments" USING btree ("exercise_id","workout_id");