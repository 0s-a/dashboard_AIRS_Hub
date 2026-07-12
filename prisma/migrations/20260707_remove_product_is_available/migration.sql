-- Drop product-level availability; controlled per SKC instead
ALTER TABLE "Product" DROP COLUMN IF EXISTS "isAvailable";
