-- SPU → SKC → SKU migration
-- Transforms Variant model into SKC/SKU hierarchy

-- ── 1. Category hierarchy + slug ─────────────────────────────
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "slug" TEXT;
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "parentId" TEXT;

UPDATE "Category"
SET "slug" = LOWER(REGEXP_REPLACE(REGEXP_REPLACE("code", '[^a-zA-Z0-9]+', '-', 'g'), '(^-|-$)', '', 'g'))
WHERE "slug" IS NULL;

UPDATE "Category" c
SET "slug" = c."slug" || '-' || SUBSTRING(c."id", 1, 8)
WHERE c."id" IN (
  SELECT "id" FROM (
    SELECT "id", ROW_NUMBER() OVER (PARTITION BY "slug" ORDER BY "createdAt") AS rn
    FROM "Category"
  ) t WHERE rn > 1
);

ALTER TABLE "Category" ALTER COLUMN "slug" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "Category_slug_key" ON "Category"("slug");

ALTER TABLE "Category"
  ADD CONSTRAINT "Category_parentId_fkey"
  FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── 2. Product slug ────────────────────────────────────────────
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "slug" TEXT;

UPDATE "Product"
SET "slug" = LOWER(REGEXP_REPLACE(REGEXP_REPLACE("productCode", '[^a-zA-Z0-9]+', '-', 'g'), '(^-|-$)', '', 'g'))
WHERE "slug" IS NULL;

UPDATE "Product" p
SET "slug" = p."slug" || '-' || SUBSTRING(p."id", 1, 8)
WHERE p."id" IN (
  SELECT "id" FROM (
    SELECT "id", ROW_NUMBER() OVER (PARTITION BY "slug" ORDER BY "createdAt") AS rn
    FROM "Product"
  ) t WHERE rn > 1
);

ALTER TABLE "Product" ALTER COLUMN "slug" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "Product_slug_key" ON "Product"("slug");

-- ── 3. SKC + SKU tables ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS "SKC" (
  "id" TEXT NOT NULL,
  "colorName" TEXT NOT NULL,
  "hexCode" TEXT,
  "suffix" TEXT NOT NULL,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "order" INTEGER NOT NULL DEFAULT 0,
  "isAvailable" BOOLEAN NOT NULL DEFAULT true,
  "productId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SKC_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SKU" (
  "id" TEXT NOT NULL,
  "skuCode" TEXT NOT NULL,
  "sizeLabel" TEXT,
  "isAvailable" BOOLEAN NOT NULL DEFAULT true,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "order" INTEGER NOT NULL DEFAULT 0,
  "skcId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SKU_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SKC_productId_suffix_key" ON "SKC"("productId", "suffix");
CREATE UNIQUE INDEX IF NOT EXISTS "SKU_skuCode_key" ON "SKU"("skuCode");
CREATE UNIQUE INDEX IF NOT EXISTS "SKU_skcId_sizeLabel_key" ON "SKU"("skcId", "sizeLabel");

ALTER TABLE "SKC"
  ADD CONSTRAINT "SKC_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SKU"
  ADD CONSTRAINT "SKU_skcId_fkey"
  FOREIGN KEY ("skcId") REFERENCES "SKC"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Temp mapping: variantId → skuId
CREATE TEMP TABLE "_variant_sku_map" (
  "variantId" TEXT PRIMARY KEY,
  "skuId" TEXT NOT NULL,
  "skcId" TEXT NOT NULL
);

-- ── 4. Migrate color/material variants → SKC + default SKU ───
INSERT INTO "SKC" ("id", "colorName", "hexCode", "suffix", "isDefault", "order", "isAvailable", "productId", "createdAt", "updatedAt")
SELECT
  v."id",
  v."name",
  v."hex",
  v."suffix",
  v."isDefault",
  v."order",
  true,
  v."productId",
  v."createdAt",
  v."updatedAt"
FROM "Variant" v
WHERE v."type" IN ('color', 'material');

INSERT INTO "SKU" ("id", "skuCode", "sizeLabel", "isAvailable", "isDefault", "order", "skcId", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  v."variantNumber",
  NULL,
  true,
  true,
  0,
  v."id",
  v."createdAt",
  v."updatedAt"
FROM "Variant" v
WHERE v."type" IN ('color', 'material');

INSERT INTO "_variant_sku_map" ("variantId", "skuId", "skcId")
SELECT v."id", s."id", v."id"
FROM "Variant" v
JOIN "SKU" s ON s."skcId" = v."id" AND s."skuCode" = v."variantNumber"
WHERE v."type" IN ('color', 'material');

-- ── 5. Migrate size variants → standard SKC + SKU per variant ─
INSERT INTO "SKC" ("id", "colorName", "hexCode", "suffix", "isDefault", "order", "isAvailable", "productId", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  'قياسي',
  NULL,
  'STD',
  true,
  0,
  true,
  p."id",
  NOW(),
  NOW()
FROM "Product" p
WHERE EXISTS (SELECT 1 FROM "Variant" v WHERE v."productId" = p."id" AND v."type" = 'size')
  AND NOT EXISTS (SELECT 1 FROM "SKC" s WHERE s."productId" = p."id" AND s."suffix" = 'STD');

INSERT INTO "SKU" ("id", "skuCode", "sizeLabel", "isAvailable", "isDefault", "order", "skcId", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  v."variantNumber",
  v."name",
  true,
  v."isDefault",
  v."order",
  s."id",
  v."createdAt",
  v."updatedAt"
FROM "Variant" v
JOIN "SKC" s ON s."productId" = v."productId" AND s."suffix" = 'STD'
WHERE v."type" = 'size';

INSERT INTO "_variant_sku_map" ("variantId", "skuId", "skcId")
SELECT v."id", s."id", sk."id"
FROM "Variant" v
JOIN "SKC" sk ON sk."productId" = v."productId" AND sk."suffix" = 'STD'
JOIN "SKU" s ON s."skcId" = sk."id" AND s."skuCode" = v."variantNumber"
WHERE v."type" = 'size';

-- ── 6. Migrate custom variants → standard SKC + SKU ──────────
INSERT INTO "SKC" ("id", "colorName", "hexCode", "suffix", "isDefault", "order", "isAvailable", "productId", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  'قياسي',
  NULL,
  'STD',
  true,
  0,
  true,
  p."id",
  NOW(),
  NOW()
FROM "Product" p
WHERE EXISTS (SELECT 1 FROM "Variant" v WHERE v."productId" = p."id" AND v."type" = 'custom')
  AND NOT EXISTS (SELECT 1 FROM "SKC" s WHERE s."productId" = p."id" AND s."suffix" = 'STD');

INSERT INTO "SKU" ("id", "skuCode", "sizeLabel", "isAvailable", "isDefault", "order", "skcId", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  v."variantNumber",
  v."name",
  true,
  v."isDefault",
  v."order",
  s."id",
  v."createdAt",
  v."updatedAt"
FROM "Variant" v
JOIN "SKC" s ON s."productId" = v."productId" AND s."suffix" = 'STD'
WHERE v."type" = 'custom';

INSERT INTO "_variant_sku_map" ("variantId", "skuId", "skcId")
SELECT v."id", s."id", sk."id"
FROM "Variant" v
JOIN "SKC" sk ON sk."productId" = v."productId" AND sk."suffix" = 'STD'
JOIN "SKU" s ON s."skcId" = sk."id" AND s."skuCode" = v."variantNumber"
WHERE v."type" = 'custom';

-- ── 7. Products without variants → default SKC + SKU ───────────
INSERT INTO "SKC" ("id", "colorName", "hexCode", "suffix", "isDefault", "order", "isAvailable", "productId", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  'قياسي',
  NULL,
  'STD',
  true,
  0,
  true,
  p."id",
  NOW(),
  NOW()
FROM "Product" p
WHERE NOT EXISTS (SELECT 1 FROM "Variant" v WHERE v."productId" = p."id")
  AND NOT EXISTS (SELECT 1 FROM "SKC" s WHERE s."productId" = p."id");

INSERT INTO "SKU" ("id", "skuCode", "sizeLabel", "isAvailable", "isDefault", "order", "skcId", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  p."productCode" || '-STD',
  NULL,
  true,
  true,
  0,
  s."id",
  NOW(),
  NOW()
FROM "Product" p
JOIN "SKC" s ON s."productId" = p."id" AND s."suffix" = 'STD'
WHERE NOT EXISTS (SELECT 1 FROM "Variant" v WHERE v."productId" = p."id")
  AND NOT EXISTS (SELECT 1 FROM "SKU" sk WHERE sk."skcId" = s."id");

-- ── 8. ProductImage → skcId ──────────────────────────────────
ALTER TABLE "ProductImage" ADD COLUMN IF NOT EXISTS "skcId" TEXT;

UPDATE "ProductImage" pi
SET "skcId" = m."skcId"
FROM "_VariantToProductImages" j
JOIN "_variant_sku_map" m ON m."variantId" = j."B"
WHERE j."A" = pi."id";

UPDATE "ProductImage" pi
SET "skcId" = (
  SELECT s."id" FROM "SKC" s
  WHERE s."productId" = pi."productId" AND s."isDefault" = true
  LIMIT 1
)
WHERE pi."skcId" IS NULL;

UPDATE "ProductImage" pi
SET "skcId" = (
  SELECT s."id" FROM "SKC" s
  WHERE s."productId" = pi."productId"
  ORDER BY s."order" ASC
  LIMIT 1
)
WHERE pi."skcId" IS NULL;

ALTER TABLE "ProductImage"
  ADD CONSTRAINT "ProductImage_skcId_fkey"
  FOREIGN KEY ("skcId") REFERENCES "SKC"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── 9. ProductPrice → skuId ───────────────────────────────────
ALTER TABLE "ProductPrice" ADD COLUMN IF NOT EXISTS "skuId" TEXT;

UPDATE "ProductPrice" pp
SET "skuId" = (
  SELECT sk."id"
  FROM "SKU" sk
  JOIN "SKC" s ON s."id" = sk."skcId"
  WHERE s."productId" = pp."productId" AND sk."isDefault" = true
  LIMIT 1
)
WHERE pp."skuId" IS NULL;

UPDATE "ProductPrice" pp
SET "skuId" = (
  SELECT sk."id"
  FROM "SKU" sk
  JOIN "SKC" s ON s."id" = sk."skcId"
  WHERE s."productId" = pp."productId"
  ORDER BY sk."order" ASC
  LIMIT 1
)
WHERE pp."skuId" IS NULL;

-- Remove duplicates after skuId assignment
DELETE FROM "ProductPrice" pp1
USING "ProductPrice" pp2
WHERE pp1."id" > pp2."id"
  AND pp1."skuId" = pp2."skuId"
  AND pp1."priceLabelId" = pp2."priceLabelId"
  AND pp1."currencyId" = pp2."currencyId"
  AND pp1."unitId" = pp2."unitId";

ALTER TABLE "ProductPrice" DROP CONSTRAINT IF EXISTS "ProductPrice_productId_fkey";
DROP INDEX IF EXISTS "ProductPrice_productId_priceLabelId_currencyId_unitId_key";
ALTER TABLE "ProductPrice" DROP COLUMN IF EXISTS "productId";
ALTER TABLE "ProductPrice" ALTER COLUMN "skuId" SET NOT NULL;

ALTER TABLE "ProductPrice"
  ADD CONSTRAINT "ProductPrice_skuId_fkey"
  FOREIGN KEY ("skuId") REFERENCES "SKU"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS "ProductPrice_skuId_priceLabelId_currencyId_unitId_key"
  ON "ProductPrice"("skuId", "priceLabelId", "currencyId", "unitId");

-- ── 10. OrderItem variantId → skuId ──────────────────────────
ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "skuId" TEXT;

UPDATE "OrderItem" oi
SET "skuId" = m."skuId"
FROM "_variant_sku_map" m
WHERE oi."variantId" = m."variantId";

ALTER TABLE "OrderItem" DROP CONSTRAINT IF EXISTS "OrderItem_variantId_fkey";
ALTER TABLE "OrderItem" DROP COLUMN IF EXISTS "variantId";

ALTER TABLE "OrderItem"
  ADD CONSTRAINT "OrderItem_skuId_fkey"
  FOREIGN KEY ("skuId") REFERENCES "SKU"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── 11. Drop Variant ─────────────────────────────────────────
DROP TABLE IF EXISTS "_VariantToProductImages";
DROP TABLE IF EXISTS "Variant";
