CREATE TYPE "public"."muscle_group" AS ENUM('chest', 'back', 'shoulders', 'arms', 'legs', 'core');--> statement-breakpoint
ALTER TABLE "exercise" ADD COLUMN "muscle_group" "muscle_group";