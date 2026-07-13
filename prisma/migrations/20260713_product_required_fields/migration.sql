-- Make itemNumber, brandId, categoryId required on Product

-- Remove products missing required fields (dev only — no data preservation needed)
DELETE FROM "Product"
WHERE "itemNumber" IS NULL
   OR TRIM("itemNumber") = ''
   OR "brandId" IS NULL
   OR "categoryId" IS NULL;

ALTER TABLE "Product" ALTER COLUMN "itemNumber" SET NOT NULL;

ALTER TABLE "Product" DROP CONSTRAINT IF EXISTS "Product_brandId_fkey";
ALTER TABLE "Product" ALTER COLUMN "brandId" SET NOT NULL;
ALTER TABLE "Product" ADD CONSTRAINT "Product_brandId_fkey"
    FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Product" DROP CONSTRAINT IF EXISTS "Product_categoryId_fkey";
ALTER TABLE "Product" ALTER COLUMN "categoryId" SET NOT NULL;
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
