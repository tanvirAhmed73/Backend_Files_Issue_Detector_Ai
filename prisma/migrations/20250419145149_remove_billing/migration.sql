/*
  Warnings:

  - The values [15000,250000,1000000,-1] on the enum `TokenLimit` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'SUBSCRIPTION_CREATED';
ALTER TYPE "NotificationType" ADD VALUE 'SUBSCRIPTION_CANCELLED';

-- AlterEnum
BEGIN;
CREATE TYPE "TokenLimit_new" AS ENUM ('PAY_AS_YOU_GO', 'BASIC', 'PRO', 'ENTERPRISE');
ALTER TYPE "TokenLimit" RENAME TO "TokenLimit_old";
ALTER TYPE "TokenLimit_new" RENAME TO "TokenLimit";
DROP TYPE "TokenLimit_old";
COMMIT;

-- AlterTable
ALTER TABLE "api_usages" ADD COLUMN     "subscription_id" TEXT;

-- AlterTable
ALTER TABLE "subscriptions" ALTER COLUMN "is_active" SET DEFAULT false;

-- CreateIndex
CREATE INDEX "api_usages_user_id_date_idx" ON "api_usages"("user_id", "date");

-- CreateIndex
CREATE INDEX "api_usages_subscription_id_idx" ON "api_usages"("subscription_id");

-- CreateIndex
CREATE INDEX "token_usages_user_id_subscription_id_idx" ON "token_usages"("user_id", "subscription_id");

-- CreateIndex
CREATE INDEX "token_usages_reset_date_idx" ON "token_usages"("reset_date");

-- AddForeignKey
ALTER TABLE "api_usages" ADD CONSTRAINT "api_usages_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
