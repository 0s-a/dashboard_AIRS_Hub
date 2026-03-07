-- Add the new column
ALTER TABLE "PersonType" ADD COLUMN "isDefault" BOOLEAN NOT NULL DEFAULT false;

-- Try to set "عميل" as the initial default if it exists
UPDATE "PersonType" SET "isDefault" = true WHERE "name" = 'عميل';
