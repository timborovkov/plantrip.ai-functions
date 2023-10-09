/*
  Warnings:

  - You are about to drop the `PlanDetails` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "PlanDetails" DROP CONSTRAINT "PlanDetails_planId_fkey";

-- DropTable
DROP TABLE "PlanDetails";
