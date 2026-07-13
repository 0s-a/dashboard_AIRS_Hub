-- Product attributes catalog + junction; remove Color / sizeLabel / specKind

-- 1) Create ProductAttribute
CREATE TABLE "ProductAttribute" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "examples" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductAttribute_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProductAttribute_code_key" ON "ProductAttribute"("code");
CREATE UNIQUE INDEX "ProductAttribute_name_key" ON "ProductAttribute"("name");

-- 2) Create ProductAttributeValue
CREATE TABLE "ProductAttributeValue" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "attributeId" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "ProductAttributeValue_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProductAttributeValue_productId_attributeId_key"
    ON "ProductAttributeValue"("productId", "attributeId");
CREATE INDEX "ProductAttributeValue_attributeId_value_idx"
    ON "ProductAttributeValue"("attributeId", "value");

ALTER TABLE "ProductAttributeValue"
    ADD CONSTRAINT "ProductAttributeValue_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProductAttributeValue"
    ADD CONSTRAINT "ProductAttributeValue_attributeId_fkey"
    FOREIGN KEY ("attributeId") REFERENCES "ProductAttribute"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- 3) Seed base attributes
INSERT INTO "ProductAttribute" ("id", "code", "name", "examples", "createdAt", "updatedAt") VALUES
    (gen_random_uuid()::text, 'color', 'اللون',
     '["أحمر","أزرق","أخضر","أسود","أبيض","قياسي"]'::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'size', 'المقاس',
     '["XS","S","M","L","XL","2XL","36","38","40","42"]'::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'capacity', 'السعة',
     '["30ml","50ml","100ml","250ml","500ml","1L"]'::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'volume', 'الحجم',
     '["صغير","وسط","كبير"]'::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'weight', 'الوزن',
     '["100g","250g","500g","1kg","2kg","5kg"]'::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 4) Backfill color from Color.name
INSERT INTO "ProductAttributeValue" ("id", "productId", "attributeId", "value")
SELECT
    gen_random_uuid()::text,
    p."id",
    (SELECT a."id" FROM "ProductAttribute" a WHERE a."code" = 'color'),
    c."name"
FROM "Product" p
JOIN "Color" c ON c."id" = p."colorId"
WHERE c."name" IS NOT NULL AND TRIM(c."name") <> '';

-- 5) Backfill sizeLabel → capacity or size by specKind
INSERT INTO "ProductAttributeValue" ("id", "productId", "attributeId", "value")
SELECT
    gen_random_uuid()::text,
    p."id",
    (SELECT a."id" FROM "ProductAttribute" a WHERE a."code" = 'capacity'),
    TRIM(p."sizeLabel")
FROM "Product" p
WHERE p."sizeLabel" IS NOT NULL
  AND TRIM(p."sizeLabel") <> ''
  AND p."specKind"::text = 'packaging';

INSERT INTO "ProductAttributeValue" ("id", "productId", "attributeId", "value")
SELECT
    gen_random_uuid()::text,
    p."id",
    (SELECT a."id" FROM "ProductAttribute" a WHERE a."code" = 'size'),
    TRIM(p."sizeLabel")
FROM "Product" p
WHERE p."sizeLabel" IS NOT NULL
  AND TRIM(p."sizeLabel") <> ''
  AND p."specKind"::text IS DISTINCT FROM 'packaging';

-- 6) Drop Product color/size/spec fields and Color table
DROP INDEX IF EXISTS "Product_name_brandId_colorId_sizeLabel_key";

ALTER TABLE "Product" DROP CONSTRAINT IF EXISTS "Product_colorId_fkey";
ALTER TABLE "Product" DROP COLUMN IF EXISTS "colorId";
ALTER TABLE "Product" DROP COLUMN IF EXISTS "sizeLabel";
ALTER TABLE "Product" DROP COLUMN IF EXISTS "specKind";

DROP TABLE IF EXISTS "Color";
DROP TYPE IF EXISTS "SpecKind";
