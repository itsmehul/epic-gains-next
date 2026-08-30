CREATE TABLE "trainer_assignment" (
	"athlete_id" text NOT NULL,
	"trainer_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "trainer_assignment_athlete_id_trainer_id_pk" PRIMARY KEY("athlete_id","trainer_id")
);
--> statement-breakpoint
ALTER TABLE "trainer_assignment" ADD CONSTRAINT "trainer_assignment_athlete_id_user_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trainer_assignment" ADD CONSTRAINT "trainer_assignment_trainer_id_user_id_fk" FOREIGN KEY ("trainer_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "trainer_assignment_trainerId_idx" ON "trainer_assignment" USING btree ("trainer_id");--> statement-breakpoint
CREATE INDEX "trainer_assignment_athleteId_idx" ON "trainer_assignment" USING btree ("athlete_id");