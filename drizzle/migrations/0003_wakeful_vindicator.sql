CREATE TYPE "public"."product_code_type" AS ENUM('barcode', 'sku');--> statement-breakpoint
CREATE TABLE "product_codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"code" text NOT NULL,
	"code_type" "product_code_type" DEFAULT 'barcode' NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "products" DROP CONSTRAINT "products_barcode_unique";--> statement-breakpoint
ALTER TABLE "products" DROP CONSTRAINT "products_sku_unique";--> statement-breakpoint
DROP INDEX "barcode_idx";--> statement-breakpoint
DROP INDEX "sku_idx";--> statement-breakpoint
ALTER TABLE "product_codes" ADD CONSTRAINT "product_codes_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "product_codes_product_id_idx" ON "product_codes" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "product_codes_code_idx" ON "product_codes" USING btree ("code");--> statement-breakpoint
CREATE INDEX "product_codes_code_unique" ON "product_codes" USING btree ("code");--> statement-breakpoint
-- Migrate existing barcodes to product_codes table
INSERT INTO "product_codes" ("product_id", "code", "code_type", "is_primary", "order", "created_at", "updated_at")
SELECT "id", "barcode", 'barcode', true, 0, "created_at", "updated_at"
FROM "products"
WHERE "barcode" IS NOT NULL AND length(trim("barcode")) > 0;--> statement-breakpoint
-- Migrate existing SKUs (only if different from barcode)
INSERT INTO "product_codes" ("product_id", "code", "code_type", "is_primary", "order", "created_at", "updated_at")
SELECT "id", "sku", 'sku', false, 1, "created_at", "updated_at"
FROM "products"
WHERE "sku" IS NOT NULL AND length(trim("sku")) > 0 AND "sku" != "barcode";--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "barcode";--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "sku";