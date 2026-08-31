import type { TelegramIncomingUpdate } from '../../../domain/telegram/telegram.js';

export interface CreateTelegramLinkToken {
  execute(userId: number): Promise<{ linkUrl: string; expiresAt: Date }>;
}
export interface GetTelegramConnection {
  execute(userId: number): Promise<{ username: string | null; connectedAt: Date } | null>;
}
export interface RevokeTelegramConnection { execute(userId: number): Promise<void>; }
export interface ProcessTelegramUpdate { execute(update: TelegramIncomingUpdate): Promise<void>; }
