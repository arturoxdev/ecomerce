CREATE TYPE "public"."payment_method" AS ENUM('CASH', 'CARD', 'TRANSFER');--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "payment_method" "payment_method" DEFAULT 'CARD' NOT NULL;