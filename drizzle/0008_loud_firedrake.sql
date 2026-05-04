CREATE TYPE "public"."home_page_slug" AS ENUM('home');--> statement-breakpoint
CREATE TABLE "home_page_contents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" text NOT NULL,
	"slug" "home_page_slug" DEFAULT 'home' NOT NULL,
	"hero_media_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "idx_home_page_store_slug" UNIQUE("store_id","slug")
);
