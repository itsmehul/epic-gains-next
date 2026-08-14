DROP INDEX "set_performedOn_idx";--> statement-breakpoint
DROP INDEX "set_workoutId_exerciseId_performedOn_idx";--> statement-breakpoint
ALTER TABLE "set" DROP COLUMN "performed_on";--> statement-breakpoint
ALTER TABLE "set" ADD COLUMN "updated_at" timestamp;--> statement-breakpoint
UPDATE "set" SET "updated_at" = "created_at" WHERE "updated_at" IS NULL;--> statement-breakpoint
ALTER TABLE "set" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "set" ALTER COLUMN "updated_at" SET NOT NULL;--> statement-breakpoint
CREATE INDEX "set_updatedAt_idx" ON "set" USING btree ("updated_at");
