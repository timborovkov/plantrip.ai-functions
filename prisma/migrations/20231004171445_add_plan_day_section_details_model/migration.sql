/*
  Warnings:

  - You are about to drop the column `section` on the `PlanDaySections` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "PlanDaySections" DROP COLUMN "section";

-- CreateTable
CREATE TABLE "PlanDaySectionDetails" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "content" TEXT NOT NULL,
    "planDaySectionsId" INTEGER,

    CONSTRAINT "PlanDaySectionDetails_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PlanDaySectionDetails" ADD CONSTRAINT "PlanDaySectionDetails_planDaySectionsId_fkey" FOREIGN KEY ("planDaySectionsId") REFERENCES "PlanDaySections"("id") ON DELETE SET NULL ON UPDATE CASCADE;
