-- CreateEnum
CREATE TYPE "PersonType" AS ENUM ('customer', 'supervisor');

-- AlterTable Customer: add type + notes
ALTER TABLE "Customer" ADD COLUMN "type" "PersonType" NOT NULL DEFAULT 'customer';
ALTER TABLE "Customer" ADD COLUMN "notes" TEXT;

-- CreateIndex
CREATE INDEX "Customer_type_idx" ON "Customer"("type");

-- Migrate Supervisors into Customer (same ids)
INSERT INTO "Customer" ("id", "name", "type", "notes", "isActive", "lastInteraction", "createdAt", "updatedAt")
SELECT
  s."id",
  s."name",
  'supervisor'::"PersonType",
  s."notes",
  s."isActive",
  s."createdAt",
  s."createdAt",
  s."updatedAt"
FROM "Supervisor" s
ON CONFLICT ("id") DO NOTHING;

-- Re-point Contact rows from supervisor to customer
UPDATE "Contact"
SET "customerId" = "supervisorId"
WHERE "supervisorId" IS NOT NULL
  AND "customerId" IS NULL;

-- Drop supervisor contact unique + FK + column
DROP INDEX IF EXISTS "contact_supervisor_type_unique";
ALTER TABLE "Contact" DROP CONSTRAINT IF EXISTS "Contact_supervisorId_fkey";
ALTER TABLE "Contact" DROP COLUMN IF EXISTS "supervisorId";

-- Drop Supervisor table
DROP TABLE IF EXISTS "Supervisor";
