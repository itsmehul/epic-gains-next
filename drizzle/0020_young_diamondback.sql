CREATE TYPE "public"."comment_role" AS ENUM('user', 'agent');--> statement-breakpoint
CREATE TABLE "user_gemini_key" (
	"user_id" text PRIMARY KEY NOT NULL,
	"ciphertext" text NOT NULL,
	"iv" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "comments" ADD COLUMN "role" "comment_role" DEFAULT 'user' NOT NULL;--> statement-breakpoint
ALTER TABLE "comments" ADD COLUMN "mentions" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "user_gemini_key" ADD CONSTRAINT "user_gemini_key_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;