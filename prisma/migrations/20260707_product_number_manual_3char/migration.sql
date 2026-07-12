-- Product number: user-entered 3-char codes (replaces auto-generated BR-CAT-SEQ)

-- Renumber existing products to 001, 002, ...
WITH renumbered AS (
  SELECT
    id,
    UPPER(LPAD(ROW_NUMBER() OVER (ORDER BY "createdAt")::text, 3, '0')) AS new_num
  FROM "Product"
)
UPDATE "Product" p
SET "productNumber" = r.new_num
FROM renumbered r
WHERE p.id = r.id;

-- Rebuild SKU codes from new product numbers
UPDATE "SKU" sku
SET "skuCode" = p."productNumber" || '-' || skc.suffix ||
  CASE
    WHEN sku."sizeLabel" IS NOT NULL AND TRIM(sku."sizeLabel") <> '' THEN
      '-' || UPPER(REGEXP_REPLACE(sku."sizeLabel", '[^a-zA-Z0-9]', '', 'g'))
    ELSE ''
  END
FROM "SKC" skc
JOIN "Product" p ON p.id = skc."productId"
WHERE sku."skcId" = skc.id;

DROP TABLE IF EXISTS "ProductNumberSequence";
