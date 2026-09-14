CREATE TYPE "PaymentMethod" AS ENUM ('ONLINE', 'COD');

ALTER TABLE "Payment"
  ADD COLUMN "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'ONLINE';
