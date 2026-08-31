CREATE TYPE "public"."notification_type" AS ENUM('mention');--> statement-breakpoint
CREATE TABLE "notification" (
	"id" text PRIMARY KEY NOT NULL,
	"recipient_id" text NOT NULL,
	"actor_id" text NOT NULL,
	"comment_id" text NOT NULL,
	"type" "notification_type" DEFAULT 'mention' NOT NULL,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_recipient_id_user_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_comment_id_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "notification_recipient_comment_type_uidx" ON "notification" USING btree ("recipient_id","comment_id","type");--> statement-breakpoint
CREATE INDEX "notification_recipientId_idx" ON "notification" USING btree ("recipient_id");--> statement-breakpoint
CREATE INDEX "notification_recipientId_createdAt_idx" ON "notification" USING btree ("recipient_id","created_at");