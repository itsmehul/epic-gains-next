CREATE TABLE "import_prompt_feedback" (
	"id" text PRIMARY KEY NOT NULL,
	"workout_id" text NOT NULL,
	"user_id" text NOT NULL,
	"prompt_version" text NOT NULL,
	"annotations" jsonb NOT NULL,
	"comment" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "import_prompt_feedback" ADD CONSTRAINT "import_prompt_feedback_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_prompt_feedback" ADD CONSTRAINT "import_prompt_feedback_workout_id_fk" FOREIGN KEY ("workout_id") REFERENCES "public"."workout"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "import_prompt_feedback_workoutId_idx" ON "import_prompt_feedback" USING btree ("workout_id");--> statement-breakpoint
CREATE INDEX "import_prompt_feedback_userId_idx" ON "import_prompt_feedback" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "import_prompt_feedback_createdAt_idx" ON "import_prompt_feedback" USING btree ("created_at");