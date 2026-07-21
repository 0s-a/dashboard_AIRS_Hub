-- Mandatory ProductFamily + move category onto family; drop name inheritance.
-- If a family has products with conflicting categoryIds, the mode (most common) wins.

-- 1) Add nullable categoryId on ProductFamily
ALTER TABLE "ProductFamily" ADD COLUMN IF NOT EXISTS "categoryId" TEXT;

-- 2) Set family category from linked products (most frequent categoryId per family)
UPDATE "ProductFamily" pf
SET "categoryId" = src."categoryId"
FROM (
  SELECT DISTINCT ON ("familyId")
    "familyId",
    "categoryId"
  FROM (
    SELECT
      p."familyId",
      p."categoryId",
      COUNT(*) AS cnt
    FROM "Product" p
    WHERE p."familyId" IS NOT NULL
    GROUP BY p."familyId", p."categoryId"
  ) ranked
  ORDER BY "familyId", cnt DESC
) src
WHERE pf.id = src."familyId"
  AND pf."categoryId" IS NULL;

-- 3) Create a family for every product without familyId
INSERT INTO "ProductFamily" ("id", "code", "name", "description", "categoryId", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  -- unique code derived from itemNumber (truncate + suffix if needed)
  LEFT(REGEXP_REPLACE(UPPER(p."itemNumber"), '[^A-Z0-9_-]', '', 'g') || '-' || REPLACE(p.id, '-', ''), 32),
  p."name",
  NULL,
  p."categoryId",
  NOW(),
  NOW()
FROM "Product" p
WHERE p."familyId" IS NULL;

UPDATE "Product" p
SET "familyId" = pf.id
FROM "ProductFamily" pf
WHERE p."familyId" IS NULL
  AND pf."code" = LEFT(REGEXP_REPLACE(UPPER(p."itemNumber"), '[^A-Z0-9_-]', '', 'g') || '-' || REPLACE(p.id, '-', ''), 32);

-- 4) Ensure every family has a category (fallback: any product category, then any category)
UPDATE "ProductFamily" pf
SET "categoryId" = p."categoryId"
FROM "Product" p
WHERE pf."categoryId" IS NULL
  AND p."familyId" = pf.id;

UPDATE "ProductFamily" pf
SET "categoryId" = (SELECT c.id FROM "Category" c ORDER BY c."createdAt" ASC LIMIT 1)
WHERE pf."categoryId" IS NULL
  AND EXISTS (SELECT 1 FROM "Category" LIMIT 1);

-- 5) Harden constraints
ALTER TABLE "ProductFamily" ALTER COLUMN "categoryId" SET NOT NULL;

ALTER TABLE "Product" ALTER COLUMN "familyId" SET NOT NULL;

-- Drop old FK (SetNull) and recreate as Restrict
ALTER TABLE "Product" DROP CONSTRAINT IF EXISTS "Product_familyId_fkey";
ALTER TABLE "Product" ADD CONSTRAINT "Product_familyId_fkey"
  FOREIGN KEY ("familyId") REFERENCES "ProductFamily"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProductFamily" DROP CONSTRAINT IF EXISTS "ProductFamily_categoryId_fkey";
ALTER TABLE "ProductFamily" ADD CONSTRAINT "ProductFamily_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "ProductFamily_categoryId_idx" ON "ProductFamily"("categoryId");

-- 6) Drop inheritance flag and product-level category
ALTER TABLE "Product" DROP COLUMN IF EXISTS "inheritsFamilyName";
ALTER TABLE "Product" DROP CONSTRAINT IF EXISTS "Product_categoryId_fkey";
DROP INDEX IF EXISTS "Product_categoryId_idx";
ALTER TABLE "Product" DROP COLUMN IF EXISTS "categoryId";
