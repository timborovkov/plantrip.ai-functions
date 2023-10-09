-- AlterTable
ALTER TABLE "User" ADD COLUMN     "currentQuotaUsed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "nextQuotaResetTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "stripe_customer_id" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "subscription_level" TEXT NOT NULL DEFAULT 'free';
