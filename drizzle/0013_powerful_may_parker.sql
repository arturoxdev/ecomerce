CREATE TABLE "about_page_media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" text NOT NULL,
	"story_image_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "idx_about_page_media_store" UNIQUE("store_id")
);
--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "facebook_url" text;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "instagram_url" text;