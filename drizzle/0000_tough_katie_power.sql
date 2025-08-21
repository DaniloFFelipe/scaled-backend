CREATE TYPE "public"."content_status" AS ENUM('ready', 'failed', 'processing', 'pending');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('watcher', 'manager');--> statement-breakpoint
CREATE TABLE "contents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"locationUrl" text NOT NULL,
	"streamUrl" text,
	"status" "content_status" DEFAULT 'pending' NOT NULL,
	"titleId" uuid NOT NULL,
	"sizeInBytes" integer NOT NULL,
	"durationInSeconds" integer NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "titles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"category" text[] NOT NULL,
	"posterUrl" text NOT NULL,
	"releaseDate" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"role" "user_role" DEFAULT 'watcher' NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "contents" ADD CONSTRAINT "contents_titleId_titles_id_fk" FOREIGN KEY ("titleId") REFERENCES "public"."titles"("id") ON DELETE no action ON UPDATE no action;