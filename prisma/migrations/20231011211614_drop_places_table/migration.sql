/*
  Warnings:

  - You are about to drop the `Places` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Places" DROP CONSTRAINT "Places_destinationId_fkey";

-- DropTable
DROP TABLE "Places";
