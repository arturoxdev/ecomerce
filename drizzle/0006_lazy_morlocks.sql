ALTER TABLE "orders" ADD COLUMN "zip_code" text;--> statement-breakpoint
ALTER TABLE "zip_delivery_zones" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "zip_delivery_zones" ADD COLUMN "updated_at" timestamp NOT NULL;