-- ============================================================
-- Image Storage Migration: Remove /uploads/ prefix from all paths
-- This converts full URL paths to sub-paths for the new image system
-- ============================================================

-- 1. MediaImage.url — remove "/uploads/" prefix
UPDATE "MediaImage" 
SET url = REPLACE(url, '/uploads/', '') 
WHERE url LIKE '/uploads/%';

-- 2. StoreSettings.logo — remove "/uploads/" prefix (includes ?t= cache buster)
UPDATE "StoreSettings" 
SET logo = REGEXP_REPLACE(logo, '^/uploads/', '') 
WHERE logo LIKE '/uploads/%';

-- 3. StoreSettings.favicon — remove "/uploads/" prefix
UPDATE "StoreSettings" 
SET favicon = REGEXP_REPLACE(favicon, '^/uploads/', '') 
WHERE favicon LIKE '/uploads/%';

-- 4. Brand.logo — remove "/uploads/" prefix
UPDATE "Brand" 
SET logo = REGEXP_REPLACE(logo, '^/uploads/', '') 
WHERE logo LIKE '/uploads/%';

-- ============================================================
-- Verification queries — run after migration to confirm success
-- ============================================================

-- Should return 0 for all:
-- SELECT COUNT(*) AS media_with_prefix FROM "MediaImage" WHERE url LIKE '/uploads/%';
-- SELECT COUNT(*) AS store_logo_with_prefix FROM "StoreSettings" WHERE logo LIKE '/uploads/%';
-- SELECT COUNT(*) AS brand_logo_with_prefix FROM "Brand" WHERE logo LIKE '/uploads/%';
