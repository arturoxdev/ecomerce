CREATE TABLE "home_hero_texts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" text NOT NULL,
	"locale" "content_locale" NOT NULL,
	"title_start" text NOT NULL,
	"title_highlight" text DEFAULT '' NOT NULL,
	"description" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "idx_home_hero_texts_locale" UNIQUE("store_id","locale")
);
