-- ProductImage: link only to SKC (remove direct Product relation)

-- Assign orphan images to default SKC per product
UPDATE "ProductImage" pi
SET "skcId" = (
  SELECT s.id FROM "SKC" s
  WHERE s."productId" = pi."productId"
  ORDER BY s."isDefault" DESC, s."order" ASC
  LIMIT 1
)
WHERE pi."skcId" IS NULL;

-- Remove images that cannot be linked to an SKC
DELETE FROM "ProductImage" WHERE "skcId" IS NULL;

-- Drop product-level relation
ALTER TABLE "ProductImage" DROP CONSTRAINT IF EXISTS "ProductImage_productId_fkey";
ALTER TABLE "ProductImage" DROP CONSTRAINT IF EXISTS "ProductImage_productId_url_key";
ALTER TABLE "ProductImage" DROP COLUMN IF EXISTS "productId";

-- Recreate SKC FK with CASCADE delete
ALTER TABLE "ProductImage" DROP CONSTRAINT IF EXISTS "ProductImage_skcId_fkey";
ALTER TABLE "ProductImage" ALTER COLUMN "skcId" SET NOT NULL;
ALTER TABLE "ProductImage"
  ADD CONSTRAINT "ProductImage_skcId_fkey"
  FOREIGN KEY ("skcId") REFERENCES "SKC"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Per-SKC URL uniqueness
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_skcId_url_key" UNIQUE ("skcId", "url");

CREATE INDEX IF NOT EXISTS "ProductImage_skcId_idx" ON "ProductImage"("skcId");
