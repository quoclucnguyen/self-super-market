CREATE TYPE "public"."activity_type" AS ENUM('product_created', 'product_updated', 'product_deleted', 'product_imported', 'category_created', 'brand_created');--> statement-breakpoint
CREATE TABLE "activity_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" integer NOT NULL,
	"activity_type" "activity_type" NOT NULL,
	"user_id" integer,
	"user_name" text,
	"changes" text,
	"ip_address" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "activity_log_entity_type_idx" ON "activity_log" USING btree ("entity_type");--> statement-breakpoint
CREATE INDEX "activity_log_entity_id_idx" ON "activity_log" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "activity_log_activity_type_idx" ON "activity_log" USING btree ("activity_type");--> statement-breakpoint
CREATE INDEX "activity_log_created_at_idx" ON "activity_log" USING btree ("created_at");