/*
  Warnings:

  - You are about to drop the column `imagePath` on the `Variant` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Variant" DROP COLUMN "imagePath",
ADD COLUMN     "imageUrl" TEXT;
