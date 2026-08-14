ALTER TABLE "set" ADD COLUMN "performed_on" date DEFAULT CURRENT_DATE NOT NULL;--> statement-breakpoint
CREATE INDEX "set_performedOn_idx" ON "set" USING btree ("performed_on");--> statement-breakpoint
CREATE INDEX "set_workoutId_exerciseId_performedOn_idx" ON "set" USING btree ("workout_id","exercise_id","performed_on");