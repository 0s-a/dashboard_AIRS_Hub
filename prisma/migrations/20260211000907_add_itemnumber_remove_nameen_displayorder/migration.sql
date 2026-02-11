/*
  Warnings:

  - You are about to drop the column `displayOrder` on the `Category` table. All the data in the column will be lost.
  - You are about to drop the column `nameEn` on the `Category` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[itemNumber]` on the table `Category` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Category" DROP COLUMN "displayOrder",
DROP COLUMN "nameEn",
ADD COLUMN     "itemNumber" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Category_itemNumber_key" ON "Category"("itemNumber");
