import type { TelegramConnection, TelegramConversation, TelegramDraft, TelegramWebhookUpdateStatus } from '../../../domain/telegram/telegram.js';

export interface TelegramLinkTokenRecord { id: number; userId: number; tokenHash: string; expiresAt: Date; usedAt: Date | null; }
export interface TelegramRepository {
  createLinkToken(data: { userId: number; tokenHash: string; expiresAt: Date }): Promise<void>;
  countLinkTokensSince(userId: number, since: Date): Promise<number>;
  findLinkToken(tokenHash: string): Promise<TelegramLinkTokenRecord | null>;
  useLinkToken(id: number, now: Date): Promise<boolean>;
  findActiveConnectionByUserId(userId: number): Promise<TelegramConnection | null>;
  findActiveConnectionByTelegramUserId(telegramUserId: string): Promise<TelegramConnection | null>;
  findActiveConnectionByChatId(chatId: string): Promise<TelegramConnection | null>;
  createConnection(data: { userId: number; telegramUserId: string; chatId: string; username?: string; firstName?: string; connectedAt: Date }): Promise<TelegramConnection>;
  revokeConnection(userId: number, now: Date): Promise<void>;
  getConversation(connectionId: number): Promise<TelegramConversation | null>;
  saveConversation(data: { connectionId: number; state: TelegramConversation['state']; draft: TelegramDraft | null; expiresAt: Date | null; lastUpdateId: string }): Promise<TelegramConversation>;
  clearConversation(connectionId: number, lastUpdateId: string): Promise<void>;
  consumeConfirmation(connectionId: number, now: Date, lastUpdateId: string): Promise<TelegramDraft | null>;
  claimUpdate(updateId: string, now: Date): Promise<boolean>;
  completeUpdate(updateId: string, status: TelegramWebhookUpdateStatus, now: Date, errorCode?: string): Promise<void>;
}

export interface TelegramBot {
  sendMessage(chatId: string, text: string, options?: { buttons?: Array<Array<{ text: string; data: string }>> }): Promise<void>;
  answerCallback(callbackId: string): Promise<void>;
}

export interface TelegramInterpreter {
  interpret(text: string, now: Date): Partial<TelegramDraft>;
}
