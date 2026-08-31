import type { PaymentType, TransactionType } from '../transaction/transaction.js';

export type TelegramConversationState = 'IDLE' | 'COLLECTING' | 'AWAITING_CONFIRMATION';
export type TelegramWebhookUpdateStatus = 'PROCESSING' | 'PROCESSED' | 'IGNORED' | 'FAILED';

export interface TelegramConnection {
  id: number;
  userId: number;
  telegramUserId: string;
  chatId: string;
  username: string | null;
  firstName: string | null;
  connectedAt: Date;
  revokedAt: Date | null;
}

export interface TelegramDraft {
  type?: Extract<TransactionType, 'INCOME' | 'EXPENSE'>;
  name?: string;
  amount?: number;
  categoryId?: number;
  categoryName?: string;
  paymentType?: PaymentType;
  installmentsCount?: number;
  date?: string;
}

export interface TelegramConversation {
  id: number;
  connectionId: number;
  state: TelegramConversationState;
  draft: TelegramDraft | null;
  expiresAt: Date | null;
}

export interface TelegramIncomingUpdate {
  updateId: string;
  chatId?: string;
  telegramUserId?: string;
  username?: string;
  firstName?: string;
  chatType?: 'private' | string;
  text?: string;
  callbackData?: string;
  callbackId?: string;
}
