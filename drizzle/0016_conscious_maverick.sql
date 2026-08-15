CREATE TYPE "public"."workout_membership_role" AS ENUM('OWNER', 'MEMBER');--> statement-breakpoint
CREATE TABLE "workout_membership" (
	"workout_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" "workout_membership_role" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "workout_membership_pk" PRIMARY KEY("workout_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "workout" DROP CONSTRAINT "workout_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "workout" ALTER COLUMN "user_id" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "workout" ADD COLUMN "youtube_video_id" text;
--> statement-breakpoint
ALTER TABLE "workout" ADD COLUMN "archived_at" timestamp;
--> statement-breakpoint
ALTER TABLE "set" ADD COLUMN "user_id" text;
--> statement-breakpoint
UPDATE "set" AS s
SET "user_id" = w."user_id"
FROM "workout" AS w
WHERE s."workout_id" = w."id";
--> statement-breakpoint
DELETE FROM "set" WHERE "user_id" IS NULL;
--> statement-breakpoint
ALTER TABLE "set" ALTER COLUMN "user_id" SET NOT NULL;
--> statement-breakpoint
INSERT INTO "workout_membership" ("workout_id", "user_id", "role")
SELECT w."id", w."user_id", 'OWNER'::"workout_membership_role"
FROM "workout" AS w
WHERE w."user_id" IS NOT NULL
ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO "workout_membership" ("workout_id", "user_id", "role")
SELECT DISTINCT s."workout_id", s."user_id", 'MEMBER'::"workout_membership_role"
FROM "set" AS s
INNER JOIN "workout" AS w ON w."id" = s."workout_id"
WHERE s."user_id" IS DISTINCT FROM w."user_id"
ON CONFLICT DO NOTHING;
--> statement-breakpoint
WITH extracted AS (
	SELECT
		we."workout_id" AS workout_id,
		CASE
			WHEN we."video_url" ~* 'youtu\.be/([A-Za-z0-9_-]{11})'
				THEN (regexp_match(we."video_url", 'youtu\.be/([A-Za-z0-9_-]{11})'))[1]
			WHEN we."video_url" ~* '[?&]v=([A-Za-z0-9_-]{11})'
				THEN (regexp_match(we."video_url", '[?&]v=([A-Za-z0-9_-]{11})'))[1]
			WHEN we."video_url" ~* 'youtube\.com/(?:embed|shorts|live)/([A-Za-z0-9_-]{11})'
				THEN (regexp_match(we."video_url", 'youtube\.com/(?:embed|shorts|live)/([A-Za-z0-9_-]{11})'))[1]
			ELSE NULL
		END AS video_id
	FROM "workout_exercise" AS we
	WHERE we."video_url" IS NOT NULL
),
ranked AS (
	SELECT
		e.workout_id,
		e.video_id,
		row_number() OVER (
			PARTITION BY e.video_id
			ORDER BY w."created_at" ASC, w."id" ASC
		) AS rn
	FROM extracted e
	INNER JOIN "workout" w ON w."id" = e.workout_id
	WHERE e.video_id IS NOT NULL
)
UPDATE "workout" AS w
SET "youtube_video_id" = ranked.video_id
FROM ranked
WHERE w."id" = ranked.workout_id
	AND ranked.rn = 1;
--> statement-breakpoint
ALTER TABLE "workout_membership" ADD CONSTRAINT "workout_membership_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_membership" ADD CONSTRAINT "workout_membership_workout_id_fk" FOREIGN KEY ("workout_id") REFERENCES "public"."workout"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "workout_membership_userId_idx" ON "workout_membership" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "workout_membership_one_owner_idx" ON "workout_membership" USING btree ("workout_id") WHERE "workout_membership"."role" = 'OWNER';--> statement-breakpoint
ALTER TABLE "set" ADD CONSTRAINT "set_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout" ADD CONSTRAINT "workout_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "set_userId_idx" ON "set" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "set_workoutId_userId_idx" ON "set" USING btree ("workout_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "workout_youtubeVideoId_unique" ON "workout" USING btree ("youtube_video_id") WHERE "workout"."youtube_video_id" is not null;--> statement-breakpoint
ALTER TABLE "exercise" DROP CONSTRAINT "exercise_user_id_user_id_fk";
--> statement-breakpoint
DROP INDEX "exercise_userId_idx";--> statement-breakpoint
ALTER TABLE "exercise" DROP COLUMN "user_id";
