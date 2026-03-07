-- Migration: Remove redundant "type" text column from Person
-- (Type info is now fully handled via the personType relation)

ALTER TABLE "Person" DROP COLUMN IF EXISTS "type";
