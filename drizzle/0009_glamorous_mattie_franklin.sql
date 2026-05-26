ALTER TYPE "public"."delivery_mode" ADD VALUE 'DISTANCE_MILES';--> statement-breakpoint
CREATE TABLE "delivery_distance_cache" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" text NOT NULL,
	"origin_lat_rounded" numeric(7, 4) NOT NULL,
	"origin_lng_rounded" numeric(7, 4) NOT NULL,
	"dest_lat_rounded" numeric(7, 4) NOT NULL,
	"dest_lng_rounded" numeric(7, 4) NOT NULL,
	"miles" numeric(6, 2) NOT NULL,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "idx_distance_cache_pair" UNIQUE("store_id","origin_lat_rounded","origin_lng_rounded","dest_lat_rounded","dest_lng_rounded")
);
--> statement-breakpoint
CREATE TABLE "delivery_distance_tiers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" text NOT NULL,
	"min_miles" numeric(6, 2) NOT NULL,
	"max_miles" numeric(6, 2) NOT NULL,
	"fee" numeric(10, 2) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "idx_distance_tiers_store_min" UNIQUE("store_id","min_miles")
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "delivery_miles" numeric(6, 2);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "delivery_destination_lat" numeric(10, 7);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "delivery_destination_lng" numeric(10, 7);--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "origin_address" text;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "origin_lat" numeric(10, 7);--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "origin_lng" numeric(10, 7);