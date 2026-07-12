-- Add flexible attributes JSONB to SKC (keys from ProductAttribute catalog)
ALTER TABLE "SKC" ADD COLUMN "attributes" JSONB;
