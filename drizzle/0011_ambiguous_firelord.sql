ALTER TABLE "orders" ADD COLUMN "event_start_time" text;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "event_window_start" text;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "event_window_end" text;