-- Migration: Merge MediaImage into ProductImage
-- This migration moves all image metadata from the separate MediaImage table
-- directly into ProductImage, eliminating the unnecessary junction pattern.

-- 1. Add new columns to ProductImage
ALTER TABLE "ProductImage" ADD COLUMN "url" TEXT;
ALTER TABLE "ProductImage" ADD COLUMN "filename" TEXT;
ALTER TABLE "ProductImage" ADD COLUMN "alt" TEXT;
ALTER TABLE "ProductImage" ADD COLUMN "sizeBytes" INTEGER;
ALTER TABLE "ProductImage" ADD COLUMN "width" INTEGER;
ALTER TABLE "ProductImage" ADD COLUMN "height" INTEGER;
ALTER TABLE "ProductImage" ADD COLUMN "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now();

-- 2. Copy data from MediaImage into ProductImage
UPDATE "ProductImage" pi
SET
    "url"       = mi."url",
    "filename"  = mi."filename",
    "alt"       = mi."alt",
    "sizeBytes" = mi."sizeBytes",
    "width"     = mi."width",
    "height"    = mi."height",
    "updatedAt" = mi."updatedAt"
FROM "MediaImage" mi
WHERE pi."mediaImageId" = mi."id";

-- 3. Apply NOT NULL constraints after data copy
ALTER TABLE "ProductImage" ALTER COLUMN "url" SET NOT NULL;
ALTER TABLE "ProductImage" ALTER COLUMN "filename" SET NOT NULL;

-- 4. Drop the old unique constraint and foreign key
ALTER TABLE "ProductImage" DROP CONSTRAINT IF EXISTS "ProductImage_productId_mediaImageId_key";
ALTER TABLE "ProductImage" DROP CONSTRAINT IF EXISTS "ProductImage_mediaImageId_fkey";

-- 5. Drop the mediaImageId column
ALTER TABLE "ProductImage" DROP COLUMN "mediaImageId";

-- 6. Drop the MediaImage table
DROP TABLE IF EXISTS "MediaImage";

-- 7. Add new unique constraint
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_productId_url_key" UNIQUE ("productId", "url");
