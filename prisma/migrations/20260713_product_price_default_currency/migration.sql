-- ProductPrice: store prices in default currency only; convert other currencies at runtime

-- Keep only prices that are in the default currency (or drop all non-default)
DELETE FROM "ProductPrice"
WHERE "currencyId" NOT IN (
  SELECT id FROM "Currency" WHERE "isDefault" = true
);

-- Drop old unique + FK
DROP INDEX IF EXISTS "ProductPrice_productId_priceLabelId_currencyId_unitId_key";
ALTER TABLE "ProductPrice" DROP CONSTRAINT IF EXISTS "ProductPrice_productId_priceLabelId_currencyId_unitId_key";
ALTER TABLE "ProductPrice" DROP CONSTRAINT IF EXISTS "ProductPrice_currencyId_fkey";

-- Remove currency column
ALTER TABLE "ProductPrice" DROP COLUMN IF EXISTS "currencyId";

-- New unique: product + label + unit
CREATE UNIQUE INDEX IF NOT EXISTS "ProductPrice_productId_priceLabelId_unitId_key"
  ON "ProductPrice"("productId", "priceLabelId", "unitId");
