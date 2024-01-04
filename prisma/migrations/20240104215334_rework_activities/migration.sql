/*
  Warnings:

  - You are about to drop the column `google_place_id` on the `Activities` table. All the data in the column will be lost.
  - You are about to drop the column `google_place_results` on the `Activities` table. All the data in the column will be lost.
  - You are about to drop the column `location` on the `Activities` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `Activities` table. All the data in the column will be lost.
  - You are about to drop the `ActivityImage` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_ActivitiesToPlan` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `destinationId` to the `Activities` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "ActivityImage" DROP CONSTRAINT "ActivityImage_activitiesId_fkey";

-- DropForeignKey
ALTER TABLE "_ActivitiesToPlan" DROP CONSTRAINT "_ActivitiesToPlan_A_fkey";

-- DropForeignKey
ALTER TABLE "_ActivitiesToPlan" DROP CONSTRAINT "_ActivitiesToPlan_B_fkey";

-- AlterTable
ALTER TABLE "Activities" DROP COLUMN "google_place_id",
DROP COLUMN "google_place_results",
DROP COLUMN "location",
DROP COLUMN "type",
ADD COLUMN     "amadeusObject" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "bookingLink" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "category" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "destinationId" INTEGER NOT NULL,
ADD COLUMN     "thumbnail" TEXT NOT NULL DEFAULT '';

-- DropTable
DROP TABLE "ActivityImage";

-- DropTable
DROP TABLE "_ActivitiesToPlan";

-- AddForeignKey
ALTER TABLE "Activities" ADD CONSTRAINT "Activities_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Destination"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
