-- Telegram integration: source/audit fields and conversation state.
CREATE TYPE "TransactionSource" AS ENUM ('WEB', 'TELEGRAM');
CREATE TYPE "TelegramConversationState" AS ENUM ('IDLE', 'COLLECTING', 'AWAITING_CONFIRMATION');
CREATE TYPE "TelegramWebhookUpdateStatus" AS ENUM ('PROCESSING', 'PROCESSED', 'IGNORED', 'FAILED');

ALTER TABLE "transactions"
  ADD COLUMN "source" "TransactionSource" NOT NULL DEFAULT 'WEB',
  ADD COLUMN "externalReference" TEXT;
CREATE UNIQUE INDEX "transactions_externalReference_key" ON "transactions"("externalReference");

CREATE TABLE "telegram_connections" (
  "id" SERIAL NOT NULL,
  "userId" INTEGER NOT NULL,
  "telegramUserId" TEXT NOT NULL,
  "chatId" TEXT NOT NULL,
  "username" TEXT,
  "firstName" TEXT,
  "connectedAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "telegram_connections_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "telegram_connections_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "telegram_connections_active_user_key" ON "telegram_connections"("userId") WHERE "revokedAt" IS NULL;
CREATE UNIQUE INDEX "telegram_connections_active_telegram_user_key" ON "telegram_connections"("telegramUserId") WHERE "revokedAt" IS NULL;
CREATE INDEX "telegram_connections_userId_idx" ON "telegram_connections"("userId");
CREATE INDEX "telegram_connections_telegramUserId_idx" ON "telegram_connections"("telegramUserId");

CREATE TABLE "telegram_link_tokens" (
  "id" SERIAL NOT NULL,
  "userId" INTEGER NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "telegram_link_tokens_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "telegram_link_tokens_tokenHash_key" UNIQUE ("tokenHash"),
  CONSTRAINT "telegram_link_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "telegram_link_tokens_userId_expiresAt_idx" ON "telegram_link_tokens"("userId", "expiresAt");

CREATE TABLE "telegram_conversations" (
  "id" SERIAL NOT NULL,
  "connectionId" INTEGER NOT NULL,
  "state" "TelegramConversationState" NOT NULL DEFAULT 'IDLE',
  "draft" JSONB,
  "expiresAt" TIMESTAMP(3),
  "lastUpdateId" BIGINT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "telegram_conversations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "telegram_conversations_connectionId_key" UNIQUE ("connectionId"),
  CONSTRAINT "telegram_conversations_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "telegram_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "telegram_webhook_updates" (
  "updateId" BIGINT NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3),
  "status" "TelegramWebhookUpdateStatus" NOT NULL DEFAULT 'PROCESSING',
  "errorCode" TEXT,
  CONSTRAINT "telegram_webhook_updates_pkey" PRIMARY KEY ("updateId")
);
