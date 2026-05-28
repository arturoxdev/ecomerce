CREATE TABLE "order_item_services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_item_id" uuid NOT NULL,
	"service_id" uuid,
	"name" text NOT NULL,
	"price" numeric(10, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"service_id" uuid,
	"name" text NOT NULL,
	"price" numeric(10, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_additional_services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"name" text NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "store_additional_services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" text NOT NULL,
	"name" text NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "services_total" numeric(10, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "order_item_services" ADD CONSTRAINT "order_item_services_order_item_id_order_items_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_item_services" ADD CONSTRAINT "order_item_services_service_id_product_additional_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."product_additional_services"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_services" ADD CONSTRAINT "order_services_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_services" ADD CONSTRAINT "order_services_service_id_store_additional_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."store_additional_services"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_additional_services" ADD CONSTRAINT "product_additional_services_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;