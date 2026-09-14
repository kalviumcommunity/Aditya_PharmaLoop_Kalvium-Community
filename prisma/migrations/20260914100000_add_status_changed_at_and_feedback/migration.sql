-- AlterTable Order
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "statusChangedAt" TIMESTAMP(3);
UPDATE "Order" SET "statusChangedAt" = "updatedAt" WHERE "statusChangedAt" IS NULL;
CREATE INDEX IF NOT EXISTS "Order_statusChangedAt_idx" ON "Order"("statusChangedAt");

-- CreateTable OrderFeedback
CREATE TABLE IF NOT EXISTS "OrderFeedback" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "OrderFeedback_orderId_key" ON "OrderFeedback"("orderId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "OrderFeedback_orderId_idx" ON "OrderFeedback"("orderId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "OrderFeedback_userId_idx" ON "OrderFeedback"("userId");

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'OrderFeedback_orderId_fkey'
  ) THEN
    ALTER TABLE "OrderFeedback" ADD CONSTRAINT "OrderFeedback_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'OrderFeedback_userId_fkey'
  ) THEN
    ALTER TABLE "OrderFeedback" ADD CONSTRAINT "OrderFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
