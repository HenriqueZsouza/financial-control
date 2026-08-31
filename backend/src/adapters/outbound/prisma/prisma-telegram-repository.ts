import { Prisma, TelegramConversationState, TelegramWebhookUpdateStatus } from '@prisma/client';
import type { TelegramRepository, TelegramLinkTokenRecord } from '../../../application/ports/outbound/telegram.js';
import type { TelegramConnection, TelegramConversation, TelegramDraft, TelegramWebhookUpdateStatus as DomainUpdateStatus } from '../../../domain/telegram/telegram.js';
import { prisma } from './prisma-client.js';

const connection = (item: { id: number; userId: number; telegramUserId: string; chatId: string; username: string | null; firstName: string | null; connectedAt: Date; revokedAt: Date | null }): TelegramConnection => item;
const conversation = (item: { id: number; connectionId: number; state: TelegramConversationState; draft: Prisma.JsonValue | null; expiresAt: Date | null }): TelegramConversation => ({
  id: item.id, connectionId: item.connectionId, state: item.state, draft: item.draft as TelegramDraft | null, expiresAt: item.expiresAt,
});
const updateStatus = (value: DomainUpdateStatus): TelegramWebhookUpdateStatus => TelegramWebhookUpdateStatus[value];

export class PrismaTelegramRepository implements TelegramRepository {
  async createLinkToken(data: { userId: number; tokenHash: string; expiresAt: Date }) {
    await prisma.$transaction([
      prisma.telegramLinkToken.updateMany({ where: { userId: data.userId, usedAt: null }, data: { usedAt: new Date() } }),
      prisma.telegramLinkToken.create({ data }),
    ]);
  }
  countLinkTokensSince(userId: number, since: Date) { return prisma.telegramLinkToken.count({ where: { userId, createdAt: { gte: since } } }); }
  findLinkToken(tokenHash: string): Promise<TelegramLinkTokenRecord | null> { return prisma.telegramLinkToken.findUnique({ where: { tokenHash } }); }
  async useLinkToken(id: number, now: Date) { return (await prisma.telegramLinkToken.updateMany({ where: { id, usedAt: null, expiresAt: { gt: now } }, data: { usedAt: now } })).count === 1; }
  async findActiveConnectionByUserId(userId: number) { const item = await prisma.telegramConnection.findFirst({ where: { userId, revokedAt: null } }); return item ? connection(item) : null; }
  async findActiveConnectionByTelegramUserId(telegramUserId: string) { const item = await prisma.telegramConnection.findFirst({ where: { telegramUserId, revokedAt: null } }); return item ? connection(item) : null; }
  async findActiveConnectionByChatId(chatId: string) { const item = await prisma.telegramConnection.findFirst({ where: { chatId, revokedAt: null } }); return item ? connection(item) : null; }
  async createConnection(data: { userId: number; telegramUserId: string; chatId: string; username?: string; firstName?: string; connectedAt: Date }) {
    const item = await prisma.telegramConnection.create({ data }); return connection(item);
  }
  async revokeConnection(userId: number, now: Date) {
    const active = await prisma.telegramConnection.findFirst({ where: { userId, revokedAt: null }, select: { id: true } });
    if (!active) return;
    await prisma.$transaction([
      prisma.telegramConnection.update({ where: { id: active.id }, data: { revokedAt: now } }),
      prisma.telegramConversation.deleteMany({ where: { connectionId: active.id } }),
    ]);
  }
  async getConversation(connectionId: number) { const item = await prisma.telegramConversation.findUnique({ where: { connectionId } }); return item ? conversation(item) : null; }
  async saveConversation(data: { connectionId: number; state: TelegramConversation['state']; draft: TelegramDraft | null; expiresAt: Date | null; lastUpdateId: string }) {
    const draft = data.draft === null ? Prisma.DbNull : data.draft as Prisma.InputJsonValue;
    const item = await prisma.telegramConversation.upsert({ where: { connectionId: data.connectionId }, create: { connectionId: data.connectionId, state: data.state, draft, expiresAt: data.expiresAt, lastUpdateId: BigInt(data.lastUpdateId) }, update: { state: data.state, draft, expiresAt: data.expiresAt, lastUpdateId: BigInt(data.lastUpdateId) } });
    return conversation(item);
  }
  async clearConversation(connectionId: number, lastUpdateId: string) { await prisma.telegramConversation.upsert({ where: { connectionId }, create: { connectionId, lastUpdateId: BigInt(lastUpdateId) }, update: { state: 'IDLE', draft: Prisma.DbNull, expiresAt: null, lastUpdateId: BigInt(lastUpdateId) } }); }
  async consumeConfirmation(connectionId: number, now: Date, lastUpdateId: string) {
    return prisma.$transaction(async (tx) => {
      const current = await tx.telegramConversation.findUnique({ where: { connectionId } });
      if (!current || current.state !== 'AWAITING_CONFIRMATION' || !current.expiresAt || current.expiresAt <= now) return null;
      const changed = await tx.telegramConversation.updateMany({ where: { connectionId, state: 'AWAITING_CONFIRMATION', expiresAt: { gt: now } }, data: { state: 'IDLE', draft: Prisma.DbNull, expiresAt: null, lastUpdateId: BigInt(lastUpdateId) } });
      return changed.count === 1 ? current.draft as TelegramDraft : null;
    });
  }
  async claimUpdate(updateId: string, now: Date) {
    try { await prisma.telegramWebhookUpdate.create({ data: { updateId: BigInt(updateId), receivedAt: now } }); return true; }
    catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return false; throw error; }
  }
  async completeUpdate(updateId: string, status: DomainUpdateStatus, now: Date, errorCode?: string) { await prisma.telegramWebhookUpdate.update({ where: { updateId: BigInt(updateId) }, data: { status: updateStatus(status), processedAt: now, errorCode: errorCode ?? null } }); }
}
