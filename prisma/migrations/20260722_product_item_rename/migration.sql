-- Product/Item rename: disposable data — drop old catalog tables and recreate

-- Notifications & order lines (FKs to old Product)
ALTER TABLE IF EXISTS "AiNotification" DROP CONSTRAINT IF EXISTS "AiNotification_productId_fkey";
ALTER TABLE IF EXISTS "OrderItem" DROP CONSTRAINT IF EXISTS "OrderItem_productId_fkey";

DROP TABLE IF EXISTS "ProductAttributeValue" CASCADE;
DROP TABLE IF EXISTS "ProductPrice" CASCADE;
DROP TABLE IF EXISTS "ProductUnit" CASCADE;
DROP TABLE IF EXISTS "ProductImage" CASCADE;
DROP TABLE IF EXISTS "Product" CASCADE;
DROP TABLE IF EXISTS "ProductFamily" CASCADE;
DROP TABLE IF EXISTS "ProductAttribute" CASCADE;

-- Recreate catalog
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "categoryId" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Product_code_key" ON "Product"("code");
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");
CREATE INDEX "Product_brandId_idx" ON "Product"("brandId");

ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Product" ADD CONSTRAINT "Product_brandId_fkey"
  FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "Item" (
    "id" TEXT NOT NULL,
    "itemNumber" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "alternativeNames" JSONB,
    "tags" JSONB,
    "productId" TEXT NOT NULL,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "search_vector" tsvector,
    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Item_itemNumber_key" ON "Item"("itemNumber");
CREATE UNIQUE INDEX "Item_slug_key" ON "Item"("slug");
CREATE INDEX "Item_productId_idx" ON "Item"("productId");

ALTER TABLE "Item" ADD CONSTRAINT "Item_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "ItemAttribute" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "examples" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ItemAttribute_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ItemAttribute_code_key" ON "ItemAttribute"("code");
CREATE UNIQUE INDEX "ItemAttribute_name_key" ON "ItemAttribute"("name");

CREATE TABLE "ItemAttributeValue" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "attributeId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    CONSTRAINT "ItemAttributeValue_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ItemAttributeValue_itemId_attributeId_key" ON "ItemAttributeValue"("itemId", "attributeId");
CREATE INDEX "ItemAttributeValue_attributeId_value_idx" ON "ItemAttributeValue"("attributeId", "value");

ALTER TABLE "ItemAttributeValue" ADD CONSTRAINT "ItemAttributeValue_itemId_fkey"
  FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ItemAttributeValue" ADD CONSTRAINT "ItemAttributeValue_attributeId_fkey"
  FOREIGN KEY ("attributeId") REFERENCES "ItemAttribute"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "ItemImage" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "alt" TEXT,
    "sizeBytes" INTEGER,
    "width" INTEGER,
    "height" INTEGER,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ItemImage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ItemImage_itemId_url_key" ON "ItemImage"("itemId", "url");
CREATE INDEX "ItemImage_itemId_idx" ON "ItemImage"("itemId");

ALTER TABLE "ItemImage" ADD CONSTRAINT "ItemImage_itemId_fkey"
  FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ItemPrice" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "priceLabelId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "value" DECIMAL(12,2) NOT NULL,
    "isAutoCalculated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ItemPrice_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ItemPrice_itemId_priceLabelId_unitId_key" ON "ItemPrice"("itemId", "priceLabelId", "unitId");

ALTER TABLE "ItemPrice" ADD CONSTRAINT "ItemPrice_itemId_fkey"
  FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ItemPrice" ADD CONSTRAINT "ItemPrice_priceLabelId_fkey"
  FOREIGN KEY ("priceLabelId") REFERENCES "PriceLabel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ItemPrice" ADD CONSTRAINT "ItemPrice_unitId_fkey"
  FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "ItemUnit" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "isBase" BOOLEAN NOT NULL DEFAULT false,
    "conversionFactor" INTEGER NOT NULL DEFAULT 1,
    "barcode" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ItemUnit_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ItemUnit_itemId_unitId_key" ON "ItemUnit"("itemId", "unitId");
CREATE UNIQUE INDEX "ItemUnit_barcode_key" ON "ItemUnit"("barcode");

ALTER TABLE "ItemUnit" ADD CONSTRAINT "ItemUnit_itemId_fkey"
  FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ItemUnit" ADD CONSTRAINT "ItemUnit_unitId_fkey"
  FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- OrderItem: productId → itemId
ALTER TABLE "OrderItem" DROP COLUMN IF EXISTS "productId";
ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "itemId" TEXT;
-- Clear orphaned order lines (data disposable)
DELETE FROM "OrderItem";
ALTER TABLE "OrderItem" ALTER COLUMN "itemId" SET NOT NULL;
CREATE INDEX IF NOT EXISTS "OrderItem_itemId_idx" ON "OrderItem"("itemId");
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_itemId_fkey"
  FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AiNotification: productId → itemId
ALTER TABLE "AiNotification" DROP COLUMN IF EXISTS "productId";
ALTER TABLE "AiNotification" ADD COLUMN IF NOT EXISTS "itemId" TEXT;
CREATE INDEX IF NOT EXISTS "AiNotification_itemId_idx" ON "AiNotification"("itemId");
ALTER TABLE "AiNotification" ADD CONSTRAINT "AiNotification_itemId_fkey"
  FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE SET NULL ON UPDATE CASCADE;
