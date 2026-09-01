import { DomainError } from '../../../domain/shared/errors.js';
import type { TelegramDraft, TelegramIncomingUpdate } from '../../../domain/telegram/telegram.js';
import type { CategoryRepository } from '../../ports/outbound/category-repository.js';
import type { Clock, SecretGenerator } from '../../ports/outbound/security.js';
import type { TelegramBot, TelegramInterpreter, TelegramRepository } from '../../ports/outbound/telegram.js';
import type { CreateTransaction } from '../../ports/inbound/transactions.js';
import type { CreateTelegramLinkToken, GetTelegramConnection, ProcessTelegramUpdate, RevokeTelegramConnection } from '../../ports/inbound/telegram.js';

const DRAFT_TTL_MS = 15 * 60 * 1000;
const LINK_TTL_MS = 10 * 60 * 1000;
const CATEGORY_PAGE_SIZE = 6;
const help = 'Envie uma despesa ou receita, por exemplo: “mercado 150,50 hoje” ou “recebi 2500 salário”. Use /despesa, /receita ou /cancelar.';
const categoryHints: Record<string, string> = { mercado: 'mercado', supermercado: 'mercado', farmácia: 'farmacia', farmacia: 'farmacia', uber: 'transporte', gasolina: 'transporte', aluguel: 'moradia', restaurante: 'lazer', salário: 'outros', salario: 'outros' };

function formatAmount(cents: number) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100); }
function formatDraft(draft: Required<Pick<TelegramDraft, 'name' | 'amount' | 'categoryName' | 'type' | 'paymentType' | 'date'>> & TelegramDraft) {
  const payment = draft.paymentType === 'INSTALLMENT' ? `Cartão parcelado · ${draft.installmentsCount}x` : draft.paymentType === 'CREDIT_1X' ? 'Cartão de crédito · 1x' : 'À vista';
  return `Confirme este lançamento:\n${draft.name} · ${formatAmount(draft.amount)} · ${draft.categoryName}\n${draft.type === 'INCOME' ? 'Receita' : 'Despesa'} · ${payment}\nData: ${new Date(draft.date).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`;
}

function categoryButtons(categories: Array<{ id: number; name: string }>, requestedOffset: number) {
  const offset = Math.min(Math.max(0, requestedOffset), Math.max(0, categories.length - 1));
  const page = categories.slice(offset, offset + CATEGORY_PAGE_SIZE);
  const buttons = page.map((category) => [{ text: category.name, data: `category:${category.id}` }]);
  const navigation = [];
  if (offset > 0) navigation.push({ text: '← Anteriores', data: `categories:${Math.max(0, offset - CATEGORY_PAGE_SIZE)}` });
  if (offset + CATEGORY_PAGE_SIZE < categories.length) navigation.push({ text: 'Próximas →', data: `categories:${offset + CATEGORY_PAGE_SIZE}` });
  return navigation.length ? [...buttons, navigation] : buttons;
}

export class CreateTelegramLinkTokenUseCase implements CreateTelegramLinkToken {
  constructor(private readonly repository: TelegramRepository, private readonly secrets: SecretGenerator, private readonly clock: Clock, private readonly enabled: boolean, private readonly botUsername: string) {}
  async execute(userId: number) {
    if (!this.enabled) throw new DomainError('TELEGRAM_NOT_CONFIGURED', 'A integração com Telegram não está disponível.');
    const now = this.clock.now();
    if (await this.repository.countLinkTokensSince(userId, new Date(now.getTime() - 60_000)) >= 3) throw new DomainError('TELEGRAM_LINK_RATE_LIMITED', 'Aguarde um minuto antes de gerar outro link de vínculo.');
    const token = this.secrets.generate(); const expiresAt = new Date(now.getTime() + LINK_TTL_MS);
    await this.repository.createLinkToken({ userId, tokenHash: this.secrets.hash(token), expiresAt });
    return { linkUrl: `https://t.me/${this.botUsername}?start=${token}`, expiresAt };
  }
}

export class GetTelegramConnectionUseCase implements GetTelegramConnection {
  constructor(private readonly repository: TelegramRepository) {}
  async execute(userId: number) { const connection = await this.repository.findActiveConnectionByUserId(userId); return connection ? { username: connection.username, connectedAt: connection.connectedAt } : null; }
}

export class RevokeTelegramConnectionUseCase implements RevokeTelegramConnection {
  constructor(private readonly repository: TelegramRepository, private readonly clock: Clock) {}
  execute(userId: number) { return this.repository.revokeConnection(userId, this.clock.now()); }
}

export class ProcessTelegramUpdateUseCase implements ProcessTelegramUpdate {
  constructor(private readonly repository: TelegramRepository, private readonly bot: TelegramBot, private readonly interpreter: TelegramInterpreter, private readonly categories: CategoryRepository, private readonly createTransaction: CreateTransaction, private readonly clock: Clock, private readonly secrets: SecretGenerator) {}
  async execute(update: TelegramIncomingUpdate) {
    const now = this.clock.now();
    if (!(await this.repository.claimUpdate(update.updateId, now))) return;
    try {
      if (!update.chatId || !update.telegramUserId || update.chatType !== 'private') return this.finish(update.updateId, 'IGNORED');
      if (update.callbackId) await this.bot.answerCallback(update.callbackId);
      if (update.text === '/start') { await this.bot.sendMessage(update.chatId, help); return this.finish(update.updateId, 'PROCESSED'); }
      if (update.text?.startsWith('/start ')) return this.start(update, now);
      const connection = await this.repository.findActiveConnectionByChatId(update.chatId);
      if (!connection || connection.telegramUserId !== update.telegramUserId) { await this.bot.sendMessage(update.chatId, 'Conecte sua conta pelo Perfil no Financial Control antes de registrar lançamentos.'); return this.finish(update.updateId, 'IGNORED'); }
      await this.processConnected(connection, update, now);
      await this.finish(update.updateId, 'PROCESSED');
    } catch (error) {
      await this.finish(update.updateId, 'FAILED', error instanceof DomainError ? error.code : 'TELEGRAM_PROCESSING_ERROR');
      throw error;
    }
  }
  private async start(update: TelegramIncomingUpdate, now: Date) {
    const code = update.text!.slice('/start '.length).trim(); const token = await this.repository.findLinkToken(this.secrets.hash(code));
    if (!token || token.usedAt || token.expiresAt <= now) { await this.bot.sendMessage(update.chatId!, 'Esse código de vínculo é inválido ou expirou. Gere outro no seu Perfil.'); return this.finish(update.updateId, 'IGNORED'); }
    if (await this.repository.findActiveConnectionByTelegramUserId(update.telegramUserId!)) { await this.bot.sendMessage(update.chatId!, 'Esta conta Telegram já está vinculada. Desvincule-a no Financial Control antes de conectá-la novamente.'); return this.finish(update.updateId, 'IGNORED'); }
    if (await this.repository.findActiveConnectionByUserId(token.userId)) { await this.bot.sendMessage(update.chatId!, 'Sua conta Financial Control já possui um Telegram vinculado. Desvincule-o no Perfil para trocar.'); return this.finish(update.updateId, 'IGNORED'); }
    if (!(await this.repository.useLinkToken(token.id, now))) { await this.bot.sendMessage(update.chatId!, 'Esse código de vínculo é inválido ou expirou. Gere outro no seu Perfil.'); return this.finish(update.updateId, 'IGNORED'); }
    await this.repository.createConnection({ userId: token.userId, telegramUserId: update.telegramUserId!, chatId: update.chatId!, username: update.username, firstName: update.firstName, connectedAt: now });
    await this.bot.sendMessage(update.chatId!, `Conta conectada com sucesso. ${help}`); await this.finish(update.updateId, 'PROCESSED');
  }
  private async processConnected(connection: { id: number; userId: number; chatId: string }, update: TelegramIncomingUpdate, now: Date) {
    const value = update.callbackData ?? update.text?.trim().toLocaleLowerCase('pt-BR');
    if (value === '/ajuda' || value === '/start') return this.bot.sendMessage(connection.chatId, help);
    if (value === '/cancelar' || value === 'cancel' || value === 'cancelar') { await this.repository.clearConversation(connection.id, update.updateId); return this.bot.sendMessage(connection.chatId, 'Rascunho cancelado.'); }
    if (value === 'confirm' || value === 'confirmar') return this.confirm(connection, update, now);
    const previous = await this.repository.getConversation(connection.id);
    const existing = previous?.expiresAt && previous.expiresAt > now ? previous.draft ?? {} : {};
    const categoryPage = value?.match(/^categories:(\d+)$/)?.[1];
    let patch: Partial<TelegramDraft> = {};
    if (value === '/despesa') patch.type = 'EXPENSE'; else if (value === '/receita') patch.type = 'INCOME'; else if (value === 'type:expense') patch.type = 'EXPENSE'; else if (value === 'type:income') patch.type = 'INCOME'; else if (value?.startsWith('category:')) patch.categoryId = Number(value.slice('category:'.length)); else if (update.text) patch = this.interpreter.interpret(update.text, now);
    const draft: TelegramDraft = { ...existing, ...patch, paymentType: patch.paymentType ?? existing.paymentType ?? 'CASH', date: patch.date ?? existing.date ?? now.toISOString() };
    const categories = await this.categories.list();
    if (!draft.categoryId && draft.name) {
      const hinted = categoryHints[draft.name.toLocaleLowerCase('pt-BR')]; const exact = categories.find((category) => category.slug === hinted || category.name.toLocaleLowerCase('pt-BR') === draft.name!.toLocaleLowerCase('pt-BR'));
      if (exact) { draft.categoryId = exact.id; draft.categoryName = exact.name; }
    }
    if (draft.categoryId) { const category = categories.find((entry) => entry.id === draft.categoryId); if (category) draft.categoryName = category.name; else delete draft.categoryId; }
    if (!draft.type) { await this.save(connection.id, draft, 'COLLECTING', update.updateId, now); return this.bot.sendMessage(connection.chatId, 'Isso é uma receita ou despesa?', { buttons: [[{ text: 'Receita', data: 'type:income' }, { text: 'Despesa', data: 'type:expense' }]] }); }
    if (!draft.name) { await this.save(connection.id, draft, 'COLLECTING', update.updateId, now); return this.bot.sendMessage(connection.chatId, 'Qual é a descrição do lançamento?'); }
    if (!draft.amount) { await this.save(connection.id, draft, 'COLLECTING', update.updateId, now); return this.bot.sendMessage(connection.chatId, 'Qual é o valor? Exemplo: 150,50'); }
    if (!draft.categoryId) {
      await this.save(connection.id, draft, 'COLLECTING', update.updateId, now);
      const offset = categoryPage ? Number(categoryPage) : 0;
      return this.bot.sendMessage(connection.chatId, 'Qual categoria devo usar?', { buttons: categoryButtons(categories, offset) });
    }
    await this.save(connection.id, draft, 'AWAITING_CONFIRMATION', update.updateId, now);
    await this.bot.sendMessage(connection.chatId, formatDraft(draft as Required<TelegramDraft>), { buttons: [[{ text: 'Confirmar', data: 'confirm' }, { text: 'Cancelar', data: 'cancel' }]] });
  }
  private async confirm(connection: { id: number; userId: number; chatId: string }, update: TelegramIncomingUpdate, now: Date) {
    const draft = await this.repository.consumeConfirmation(connection.id, now, update.updateId);
    if (!draft?.type || !draft.name || !draft.amount || !draft.categoryId || !draft.paymentType || !draft.date) return this.bot.sendMessage(connection.chatId, 'Não há um lançamento pendente para confirmar.');
    const transactions = await this.createTransaction.execute(connection.userId, { type: draft.type, name: draft.name, amount: draft.amount, categoryId: draft.categoryId, paymentType: draft.paymentType, ...(draft.installmentsCount ? { installmentsCount: draft.installmentsCount } : {}), date: new Date(draft.date), source: 'TELEGRAM', externalReference: `telegram:${connection.id}:${update.callbackId ?? update.updateId}` });
    await this.bot.sendMessage(connection.chatId, transactions.length === 1 ? `Pronto. Criei “${draft.name}”.` : `Pronto. Criei ${transactions.length} parcelas de “${draft.name}”.`);
  }
  private save(connectionId: number, draft: TelegramDraft, state: 'COLLECTING' | 'AWAITING_CONFIRMATION', updateId: string, now: Date) { return this.repository.saveConversation({ connectionId, state, draft, expiresAt: new Date(now.getTime() + DRAFT_TTL_MS), lastUpdateId: updateId }); }
  private finish(updateId: string, status: 'PROCESSED' | 'IGNORED' | 'FAILED', errorCode?: string) { return this.repository.completeUpdate(updateId, status, this.clock.now(), errorCode); }
}
