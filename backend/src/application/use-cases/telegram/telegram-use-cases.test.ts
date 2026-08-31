import assert from 'node:assert/strict';
import test from 'node:test';
import type { CategoryRepository } from '../../ports/outbound/category-repository.js';
import type { Clock, SecretGenerator } from '../../ports/outbound/security.js';
import type { TelegramBot, TelegramLinkTokenRecord, TelegramRepository } from '../../ports/outbound/telegram.js';
import type { CreateTransaction } from '../../ports/inbound/transactions.js';
import type { TelegramConnection, TelegramConversation, TelegramDraft, TelegramWebhookUpdateStatus } from '../../../domain/telegram/telegram.js';
import { CreateTelegramLinkTokenUseCase, ProcessTelegramUpdateUseCase } from './telegram-use-cases.js';
import { RuleBasedTelegramInterpreter } from '../../../adapters/outbound/telegram/rule-based-telegram-interpreter.js';

const now = new Date('2026-08-30T13:30:00.000Z');
const clock: Clock = { now: () => now };
const secrets: SecretGenerator = { generate: () => 'opaque-code', hash: (value) => `hash:${value}` };
class Categories implements CategoryRepository {
  async list() { return [{ id: 1, name: 'Mercado', slug: 'mercado', icon: null, createdAt: now, updatedAt: now }]; }
  async exists(id: number) { return id === 1; }
}
class Repository implements TelegramRepository {
  tokens: TelegramLinkTokenRecord[] = []; connection: TelegramConnection | null = null; conversation: TelegramConversation | null = null; updates = new Set<string>();
  async createLinkToken(data: { userId: number; tokenHash: string; expiresAt: Date }) { this.tokens.push({ id: this.tokens.length + 1, ...data, usedAt: null }); }
  async countLinkTokensSince(_userId: number, _since: Date) { return 0; }
  async findLinkToken(tokenHash: string) { return this.tokens.find((token) => token.tokenHash === tokenHash) ?? null; }
  async useLinkToken(id: number, at: Date) { const token = this.tokens.find((entry) => entry.id === id); if (!token || token.usedAt || token.expiresAt <= at) return false; token.usedAt = at; return true; }
  async findActiveConnectionByUserId(userId: number) { return this.connection?.userId === userId && !this.connection.revokedAt ? this.connection : null; }
  async findActiveConnectionByTelegramUserId(telegramUserId: string) { return this.connection?.telegramUserId === telegramUserId && !this.connection.revokedAt ? this.connection : null; }
  async findActiveConnectionByChatId(chatId: string) { return this.connection?.chatId === chatId && !this.connection.revokedAt ? this.connection : null; }
  async createConnection(data: { userId: number; telegramUserId: string; chatId: string; username?: string; firstName?: string; connectedAt: Date }) { this.connection = { id: 1, ...data, username: data.username ?? null, firstName: data.firstName ?? null, revokedAt: null }; return this.connection; }
  async revokeConnection(_userId: number, at: Date) { if (this.connection) this.connection.revokedAt = at; this.conversation = null; }
  async getConversation(_connectionId: number) { return this.conversation; }
  async saveConversation(data: { connectionId: number; state: TelegramConversation['state']; draft: TelegramDraft | null; expiresAt: Date | null; lastUpdateId: string }) { this.conversation = { id: 1, connectionId: data.connectionId, state: data.state, draft: data.draft, expiresAt: data.expiresAt }; return this.conversation; }
  async clearConversation(_connectionId: number, _lastUpdateId: string) { this.conversation = null; }
  async consumeConfirmation(_connectionId: number, at: Date, _lastUpdateId: string) { if (!this.conversation || this.conversation.state !== 'AWAITING_CONFIRMATION' || !this.conversation.expiresAt || this.conversation.expiresAt <= at) return null; const draft = this.conversation.draft; this.conversation = null; return draft; }
  async claimUpdate(updateId: string) { if (this.updates.has(updateId)) return false; this.updates.add(updateId); return true; }
  async completeUpdate(_updateId: string, _status: TelegramWebhookUpdateStatus, _at: Date, _errorCode?: string) {}
}
class Bot implements TelegramBot { messages: string[] = []; async sendMessage(_chatId: string, text: string) { this.messages.push(text); } async answerCallback(_callbackId: string) {} }

test('telegram: gera código opaco com validade de dez minutos', async () => {
  const repository = new Repository(); const result = await new CreateTelegramLinkTokenUseCase(repository, secrets, clock, true, 'FinancialControlBot').execute(7);
  assert.equal(result.linkUrl, 'https://t.me/FinancialControlBot?start=opaque-code'); assert.equal(result.expiresAt.toISOString(), '2026-08-30T13:40:00.000Z'); assert.equal(repository.tokens[0].tokenHash, 'hash:opaque-code');
});

test('telegram: vincula, confirma uma despesa e ignora confirmação repetida', async () => {
  const repository = new Repository(); const bot = new Bot(); const created: Parameters<CreateTransaction['execute']>[1][] = [];
  await repository.createLinkToken({ userId: 7, tokenHash: 'hash:opaque-code', expiresAt: new Date('2026-08-30T13:40:00.000Z') });
  const create: CreateTransaction = { execute: async (_userId, input) => { created.push(input); return [{ id: 1 }] as any; } };
  const useCase = new ProcessTelegramUpdateUseCase(repository, bot, new RuleBasedTelegramInterpreter(), new Categories(), create, clock, secrets);
  await useCase.execute({ updateId: '1', chatId: 'chat-1', telegramUserId: 'tg-1', chatType: 'private', text: '/start opaque-code' });
  await useCase.execute({ updateId: '2', chatId: 'chat-1', telegramUserId: 'tg-1', chatType: 'private', text: '/despesa' });
  await useCase.execute({ updateId: '3', chatId: 'chat-1', telegramUserId: 'tg-1', chatType: 'private', text: 'mercado 150,50 hoje' });
  assert.equal(repository.conversation?.state, 'AWAITING_CONFIRMATION');
  await useCase.execute({ updateId: '4', chatId: 'chat-1', telegramUserId: 'tg-1', chatType: 'private', callbackData: 'confirm', callbackId: 'callback-1' });
  await useCase.execute({ updateId: '5', chatId: 'chat-1', telegramUserId: 'tg-1', chatType: 'private', callbackData: 'confirm', callbackId: 'callback-2' });
  assert.equal(created.length, 1);
  assert.equal(created[0].externalReference, 'telegram:1:callback-1'); assert.equal(created[0].amount, 15050); assert.equal(created[0].categoryId, 1);
});
