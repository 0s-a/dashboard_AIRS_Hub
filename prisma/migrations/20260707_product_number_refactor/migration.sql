-- Product number refactor: productCode → productNumber, itemNumber → SKC, brand 1-char
-- Format: {BRAND}-{CATEGORY}-{SEQ3} e.g. S-EL-001

-- 1. Add new columns
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "productNumber" TEXT;
ALTER TABLE "SKC" ADD COLUMN IF NOT EXISTS "itemNumber" TEXT;

-- 2. Shorten brand codes (2 → 1 char), resolve conflicts with numeric suffix
WITH ranked AS (
  SELECT id, code,
    UPPER(LEFT(code, 1)) AS new_code,
    ROW_NUMBER() OVER (PARTITION BY UPPER(LEFT(code, 1)) ORDER BY "createdAt") AS rn
  FROM "Brand"
)
UPDATE "Brand" b
SET code = CASE WHEN r.rn = 1 THEN r.new_code ELSE r.rn::text END
FROM ranked r
WHERE b.id = r.id;

-- 3. Ensure category codes are 2 chars max
UPDATE "Category"
SET code = UPPER(LEFT(code, 2))
WHERE LENGTH(code) > 2;

-- 4. Build productNumber: BR-CAT-SEQ from legacy data + brand/category joins
WITH numbered AS (
  SELECT
    p.id,
    COALESCE(b.code, 'X') AS br,
    COALESCE(UPPER(LEFT(c.code, 2)), 'GE') AS cat,
    ROW_NUMBER() OVER (
      PARTITION BY COALESCE(b.code, 'X'), COALESCE(UPPER(LEFT(c.code, 2)), 'GE')
      ORDER BY p."createdAt"
    ) AS seq
  FROM "Product" p
  LEFT JOIN "Brand" b ON b.id = p."brandId"
  LEFT JOIN "Category" c ON c.id = p."categoryId"
)
UPDATE "Product" p
SET "productNumber" = n.br || '-' || n.cat || '-' || LPAD(n.seq::text, 3, '0')
FROM numbered n
WHERE p.id = n.id AND p."productNumber" IS NULL;

-- 5. Move itemNumber from Product to default SKC
UPDATE "SKC" skc
SET "itemNumber" = p."itemNumber"
FROM "Product" p
WHERE skc."productId" = p.id
  AND skc."isDefault" = true
  AND p."itemNumber" IS NOT NULL
  AND skc."itemNumber" IS NULL;

-- 6. Rebuild SKU codes from productNumber
UPDATE "SKU" sku
SET "skuCode" = p."productNumber" || '-' || skc.suffix ||
  CASE WHEN sku."sizeLabel" IS NOT NULL AND sku."sizeLabel" <> ''
    THEN '-' || REGEXP_REPLACE(UPPER(sku."sizeLabel"), '[^A-Z0-9]', '', 'g')
    ELSE '' END
FROM "SKC" skc
JOIN "Product" p ON p.id = skc."productId"
WHERE sku."skcId" = skc.id
  AND p."productNumber" IS NOT NULL;

-- 7. Migrate sequence table
CREATE TABLE IF NOT EXISTS "ProductNumberSequence" (
  "id" TEXT NOT NULL,
  "categoryCode" TEXT NOT NULL,
  "brandCode" TEXT NOT NULL,
  "lastSequence" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProductNumberSequence_pkey" PRIMARY KEY ("id")
);

INSERT INTO "ProductNumberSequence" ("id", "categoryCode", "brandCode", "lastSequence", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  COALESCE(UPPER(LEFT(c.code, 2)), 'GE'),
  COALESCE(b.code, 'X'),
  COUNT(*)::int,
  NOW(),
  NOW()
FROM "Product" p
LEFT JOIN "Brand" b ON b.id = p."brandId"
LEFT JOIN "Category" c ON c.id = p."categoryId"
WHERE p."productNumber" IS NOT NULL
GROUP BY COALESCE(UPPER(LEFT(c.code, 2)), 'GE'), COALESCE(b.code, 'X')
ON CONFLICT ("categoryCode", "brandCode") DO UPDATE
SET "lastSequence" = GREATEST("ProductNumberSequence"."lastSequence", EXCLUDED."lastSequence"),
    "updatedAt" = NOW();

CREATE UNIQUE INDEX IF NOT EXISTS "ProductNumberSequence_categoryCode_brandCode_key"
  ON "ProductNumberSequence"("categoryCode", "brandCode");

-- 8. Drop legacy columns and table
ALTER TABLE "Product" DROP COLUMN IF EXISTS "productCode";
ALTER TABLE "Product" DROP COLUMN IF EXISTS "itemNumber";
ALTER TABLE "Product" ALTER COLUMN "productNumber" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "Product_productNumber_key" ON "Product"("productNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "SKC_itemNumber_key" ON "SKC"("itemNumber") WHERE "itemNumber" IS NOT NULL;

DROP TABLE IF EXISTS "ProductCodeSequence";
