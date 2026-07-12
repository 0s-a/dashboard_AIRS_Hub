-- Add skuSpecKind to Product — drives UI labels for SKU.sizeLabel (مقاس/عبوة/طول/…)

CREATE TYPE "SkuSpecKind" AS ENUM ('size', 'packaging', 'length', 'free');

ALTER TABLE "Product" ADD COLUMN "skuSpecKind" "SkuSpecKind" NOT NULL DEFAULT 'free';
