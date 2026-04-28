ALTER TABLE "availability" RENAME COLUMN "start_date" TO "date";--> statement-breakpoint
ALTER TABLE "order_items" RENAME COLUMN "rent_start_date" TO "rent_date";--> statement-breakpoint
DROP INDEX "idx_availability_lookup";--> statement-breakpoint
CREATE INDEX "idx_availability_lookup" ON "availability" USING btree ("product_id","date");--> statement-breakpoint
ALTER TABLE "availability" DROP COLUMN "end_date";--> statement-breakpoint
ALTER TABLE "order_items" DROP COLUMN "rent_end_date";