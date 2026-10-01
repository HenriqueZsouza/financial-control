ALTER TYPE "PayableStatus" ADD VALUE 'PAID';

ALTER TABLE "payables" ADD COLUMN "paidAt" TIMESTAMP(3);
ALTER TABLE "payables" ADD COLUMN "paymentTransactionId" INTEGER;

CREATE UNIQUE INDEX "payables_paymentTransactionId_key" ON "payables"("paymentTransactionId");

ALTER TABLE "payables" ADD CONSTRAINT "payables_paymentTransactionId_fkey" FOREIGN KEY ("paymentTransactionId") REFERENCES "transactions"("id") ON DELETE RESTRICT;
