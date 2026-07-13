-- Remove slug, parentId, icon from Category

ALTER TABLE "Category" DROP CONSTRAINT IF EXISTS "Category_parentId_fkey";
DROP INDEX IF EXISTS "Category_slug_key";
ALTER TABLE "Category" DROP COLUMN IF EXISTS "slug";
ALTER TABLE "Category" DROP COLUMN IF EXISTS "parentId";
ALTER TABLE "Category" DROP COLUMN IF EXISTS "icon";
