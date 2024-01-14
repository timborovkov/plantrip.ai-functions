-- AlterTable
ALTER TABLE "Trip" ADD COLUMN     "endDate" TEXT DEFAULT '',
ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "startDate" TEXT DEFAULT '';
