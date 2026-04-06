INSERT INTO "categories" ("name", "description")
VALUES ('Chưa phân loại', 'Auto-created fallback category')
ON CONFLICT ("name") DO NOTHING;
--> statement-breakpoint

INSERT INTO "categories" ("name")
SELECT DISTINCT p."category"
FROM "products" p
WHERE p."category_id" IS NULL
  AND p."category" IS NOT NULL
  AND length(trim(p."category")) > 0
ON CONFLICT ("name") DO NOTHING;
--> statement-breakpoint

UPDATE "products" p
SET "category_id" = c."id",
    "category" = c."name"
FROM "categories" c
WHERE p."category_id" IS NULL
  AND p."category" IS NOT NULL
  AND lower(c."name") = lower(p."category");
--> statement-breakpoint

UPDATE "products"
SET "category_id" = (
      SELECT "id"
      FROM "categories"
      WHERE "name" = 'Chưa phân loại'
      LIMIT 1
    ),
    "category" = COALESCE(NULLIF(trim("category"), ''), 'Chưa phân loại')
WHERE "category_id" IS NULL;
--> statement-breakpoint

ALTER TABLE "products" DROP CONSTRAINT "products_category_id_categories_id_fk";
--> statement-breakpoint

ALTER TABLE "products" ALTER COLUMN "category_id" SET NOT NULL;
--> statement-breakpoint

ALTER TABLE "products"
ADD CONSTRAINT "products_category_id_categories_id_fk"
FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id")
ON DELETE restrict ON UPDATE no action;