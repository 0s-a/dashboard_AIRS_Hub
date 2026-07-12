-- CreateTable
CREATE TABLE "Color" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hexCode" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Color_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Color_code_key" ON "Color"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Color_name_key" ON "Color"("name");

-- Drop dependent data (no data preservation required)
DELETE FROM "ProductImage";
DELETE FROM "ProductPrice";
DELETE FROM "OrderItem";
DELETE FROM "SKU";
DELETE FROM "SKC";

-- DropIndex
DROP INDEX IF EXISTS "SKC_productId_suffix_key";

-- AlterTable
ALTER TABLE "SKC" DROP COLUMN "colorName",
DROP COLUMN "hexCode",
DROP COLUMN "suffix",
ADD COLUMN "colorId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "SKC_productId_colorId_key" ON "SKC"("productId", "colorId");

-- AddForeignKey
ALTER TABLE "SKC" ADD CONSTRAINT "SKC_colorId_fkey" FOREIGN KEY ("colorId") REFERENCES "Color"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
