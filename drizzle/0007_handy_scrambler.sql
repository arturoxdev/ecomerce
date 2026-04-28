ALTER TABLE "zip_delivery_zones" DROP CONSTRAINT "idx_zip_store_code";--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "city" text;--> statement-breakpoint
ALTER TABLE "zip_delivery_zones" ADD COLUMN "city" text NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_zip_store_zip" ON "zip_delivery_zones" USING btree ("store_id","zip_code");--> statement-breakpoint
ALTER TABLE "zip_delivery_zones" ADD CONSTRAINT "idx_zip_store_city_code" UNIQUE("store_id","city","zip_code");