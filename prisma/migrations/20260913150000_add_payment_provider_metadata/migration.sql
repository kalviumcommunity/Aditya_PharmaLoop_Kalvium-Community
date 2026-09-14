ALTER TABLE "Payment"
  ADD COLUMN "provider" TEXT,
  ADD COLUMN "providerOrderId" TEXT,
  ADD COLUMN "providerPaymentId" TEXT,
  ADD COLUMN "providerSignature" TEXT,
  ADD COLUMN "currency" TEXT,
  ADD COLUMN "providerStatus" TEXT,
  ADD COLUMN "providerErrorCode" TEXT,
  ADD COLUMN "providerErrorDescription" TEXT;

CREATE UNIQUE INDEX "Payment_providerOrderId_key" ON "Payment"("providerOrderId");
CREATE UNIQUE INDEX "Payment_providerPaymentId_key" ON "Payment"("providerPaymentId");
