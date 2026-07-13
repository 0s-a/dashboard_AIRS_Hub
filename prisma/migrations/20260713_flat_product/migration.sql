-- Flatten Product + SKC + SKU into single Product table (no data migration)

-- 1. Rename enum
ALTER TYPE "SkuSpecKind" RENAME TO "SpecKind";

-- 2. Clear dependent rows (no data preservation in dev)
DELETE FROM "OrderItem";
DELETE FROM "AiNotification" WHERE "productId" IS NOT NULL;
DELETE FROM "ProductPrice";
DELETE FROM "ProductImage";
DELETE FROM "ProductUnit";

-- 3. Drop legacy tables
DROP TABLE IF EXISTS "SKU";
DROP TABLE IF EXISTS "SKC";
DROP TABLE IF EXISTS "ProductAttribute";
DROP TABLE IF EXISTS "Product";

-- 4. Create flat Product table
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "itemNumber" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "specKind" "SpecKind" NOT NULL DEFAULT 'free',
    "brandId" TEXT,
    "description" TEXT,
    "alternativeNames" JSONB,
    "tags" JSONB,
    "categoryId" TEXT,
    "colorId" TEXT NOT NULL,
    "sizeLabel" TEXT,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "search_vector" tsvector,
    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Product_itemNumber_key" ON "Product"("itemNumber");
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");
CREATE UNIQUE INDEX "Product_name_brandId_colorId_sizeLabel_key"
    ON "Product"("name", "brandId", "colorId", "sizeLabel");
ALTER TABLE "Product" ADD CONSTRAINT "Product_brandId_fkey"
    FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Product" ADD CONSTRAINT "Product_colorId_fkey"
    FOREIGN KEY ("colorId") REFERENCES "Color"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 5. ProductPrice: skuId → productId
ALTER TABLE "ProductPrice" DROP CONSTRAINT IF EXISTS "ProductPrice_skuId_fkey";
ALTER TABLE "ProductPrice" RENAME COLUMN "skuId" TO "productId";
ALTER TABLE "ProductPrice" DROP CONSTRAINT IF EXISTS "ProductPrice_skuId_priceLabelId_currencyId_unitId_key";
ALTER TABLE "ProductPrice" ADD CONSTRAINT "ProductPrice_productId_priceLabelId_currencyId_unitId_key"
    UNIQUE ("productId", "priceLabelId", "currencyId", "unitId");
ALTER TABLE "ProductPrice" ADD CONSTRAINT "ProductPrice_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 6. ProductImage: skcId → productId
ALTER TABLE "ProductImage" DROP CONSTRAINT IF EXISTS "ProductImage_skcId_fkey";
ALTER TABLE "ProductImage" DROP CONSTRAINT IF EXISTS "ProductImage_skcId_url_key";
DROP INDEX IF EXISTS "ProductImage_skcId_idx";
ALTER TABLE "ProductImage" RENAME COLUMN "skcId" TO "productId";
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE UNIQUE INDEX "ProductImage_productId_url_key" ON "ProductImage"("productId", "url");
CREATE INDEX "ProductImage_productId_idx" ON "ProductImage"("productId");

-- 7. ProductUnit: re-add FK to new Product
ALTER TABLE "ProductUnit" DROP CONSTRAINT IF EXISTS "ProductUnit_productId_fkey";
ALTER TABLE "ProductUnit" ADD CONSTRAINT "ProductUnit_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 8. OrderItem: drop skuId, ensure productId FK
ALTER TABLE "OrderItem" DROP CONSTRAINT IF EXISTS "OrderItem_skuId_fkey";
ALTER TABLE "OrderItem" DROP COLUMN IF EXISTS "skuId";
ALTER TABLE "OrderItem" DROP CONSTRAINT IF EXISTS "OrderItem_productId_fkey";
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "OrderItem_productId_idx" ON "OrderItem"("productId");

-- 9. AiNotification FK
ALTER TABLE "AiNotification" DROP CONSTRAINT IF EXISTS "AiNotification_productId_fkey";
ALTER TABLE "AiNotification" ADD CONSTRAINT "AiNotification_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
