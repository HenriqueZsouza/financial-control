CREATE TYPE "PayableSource" AS ENUM ('CREDIT_CARD_INVOICE');
CREATE TYPE "PayableStatus" AS ENUM ('PENDING');

CREATE TABLE "payables" (
  "id" SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "dueDate" TIMESTAMP(3) NOT NULL,
  "source" "PayableSource" NOT NULL,
  "status" "PayableStatus" NOT NULL DEFAULT 'PENDING',
  "closedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "payables_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
);

ALTER TABLE "transactions" ADD COLUMN "payableId" INTEGER;

CREATE INDEX "payables_userId_dueDate_idx" ON "payables"("userId", "dueDate");
CREATE INDEX "payables_userId_deletedAt_idx" ON "payables"("userId", "deletedAt");
CREATE INDEX "transactions_payableId_idx" ON "transactions"("payableId");

ALTER TABLE "transactions" ADD CONSTRAINT "transactions_payableId_fkey" FOREIGN KEY ("payableId") REFERENCES "payables"("id") ON DELETE RESTRICT;
