-- AlterTable
ALTER TABLE "Plan" ADD COLUMN     "accommodationBooking" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "specialRequests" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "travelersCount" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "tripBudget" TEXT NOT NULL DEFAULT '';
