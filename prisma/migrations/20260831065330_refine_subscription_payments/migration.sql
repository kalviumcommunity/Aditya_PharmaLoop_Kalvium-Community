-- AlterTable
ALTER TABLE "PaymentAttempt" ADD COLUMN     "failureReason" TEXT;

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "pausedAt" TIMESTAMP(3);
