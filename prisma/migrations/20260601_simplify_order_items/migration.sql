-- Migration: Simplify OrderItem — remove stored price fields
-- Price is now computed dynamically from ProductPrice using customer's priceLabelId + default currency

-- Remove price fields from OrderItem
ALTER TABLE "OrderItem" 
  DROP COLUMN IF EXISTS "priceLabelId",
  DROP COLUMN IF EXISTS "unitPrice",
  DROP COLUMN IF EXISTS "currencyId";

-- Remove stored total from Order (computed dynamically)
ALTER TABLE "Order" DROP COLUMN IF EXISTS "totalAmount";
