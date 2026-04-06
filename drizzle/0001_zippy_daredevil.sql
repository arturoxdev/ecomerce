ALTER TABLE "order_items" ADD COLUMN "rent_start_date" timestamp (6) NOT NULL;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "rent_end_date" timestamp (6) NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "rent_start_date";--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "rent_end_date";