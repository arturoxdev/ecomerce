-- Create product_variants table
CREATE TABLE "product_variants" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "product_id" uuid NOT NULL,
  "name" text NOT NULL,
  "price" numeric(10, 2) NOT NULL,
  "stock" integer DEFAULT 1 NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "product_variants"
  ADD CONSTRAINT "product_variants_product_id_products_id_fk"
  FOREIGN KEY ("product_id") REFERENCES "public"."products"("id")
  ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

-- Add variant_id to order_items
ALTER TABLE "order_items" ADD COLUMN "variant_id" uuid;
--> statement-breakpoint
ALTER TABLE "order_items"
  ADD CONSTRAINT "order_items_variant_id_product_variants_id_fk"
  FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id")
  ON DELETE set null ON UPDATE no action;
--> statement-breakpoint

-- Add variant_id to availability
ALTER TABLE "availability" ADD COLUMN "variant_id" uuid;
--> statement-breakpoint
ALTER TABLE "availability"
  ADD CONSTRAINT "availability_variant_id_product_variants_id_fk"
  FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id")
  ON DELETE set null ON UPDATE no action;
