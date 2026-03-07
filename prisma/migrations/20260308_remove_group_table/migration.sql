-- Migration: Remove Group table, move groupName + groupNumber into Person

-- 1. Add new columns to Person
ALTER TABLE "Person" ADD COLUMN "groupName" TEXT;
ALTER TABLE "Person" ADD COLUMN "groupNumber" TEXT;

-- 2. Migrate existing data from Group → Person
UPDATE "Person" p
SET "groupName" = g.name, "groupNumber" = g.number
FROM "Group" g
WHERE g."personId" = p.id;

-- 3. Drop Group table (cascade removes FK constraints)
DROP TABLE IF EXISTS "Group" CASCADE;
