import type { TelegramInterpreter } from '../../../application/ports/outbound/telegram.js';
import type { TelegramDraft } from '../../../domain/telegram/telegram.js';

const amountPattern = /(?:r\$\s*)?(\d{1,9}(?:[.,]\d{1,2})?)/i;

function cents(value: string) {
  const normalized = value.replace(',', '.');
  const number = Number(normalized);
  return Number.isFinite(number) && number > 0 && number <= 9_999_999.99 ? Math.round(number * 100) : undefined;
}

function dateFromText(text: string, now: Date) {
  if (/\bhoje\b/i.test(text)) return now.toISOString();
  if (/\bontem\b/i.test(text)) return new Date(now.getTime() - 86_400_000).toISOString();
  const match = text.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?\b/);
  if (!match) return undefined;
  const year = Number(match[3] ?? now.getUTCFullYear());
  const month = Number(match[2]); const day = Number(match[1]);
  const date = new Date(Date.UTC(year, month - 1, day, now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds()));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? date.toISOString() : undefined;
}

export class RuleBasedTelegramInterpreter implements TelegramInterpreter {
  interpret(input: string, now: Date): Partial<TelegramDraft> {
    const text = input.trim(); const lower = text.toLocaleLowerCase('pt-BR');
    const amount = text.match(amountPattern)?.[1];
    const installments = lower.match(/\b(\d{1,3})\s*x\b/);
    const paymentType = installments && Number(installments[1]) >= 2 && Number(installments[1]) <= 120
      ? 'INSTALLMENT' as const
      : /\b(cart[aã]o|cr[eé]dito)\b/.test(lower) ? 'CREDIT_1X' as const : undefined;
    const type = /\b(recebi|receita|entrada|sal[aá]rio|venda)\b/.test(lower)
      ? 'INCOME' as const : /\b(despesa|paguei|comprei|gastei)\b/.test(lower) ? 'EXPENSE' as const : undefined;
    const name = text
      .replace(amountPattern, '').replace(/\b(no|na|em)\s+(cart[aã]o|cr[eé]dito)\b/ig, '')
      .replace(/\b(parcelado|em\s+\d{1,3}\s*x|hoje|ontem|recebi|receita|entrada|despesa|paguei|comprei|gastei)\b/ig, '')
      .replace(/\s+/g, ' ').trim().replace(/^[,;:-]+|[,;:-]+$/g, '');
    return {
      ...(amount ? { amount: cents(amount) } : {}),
      ...(type ? { type } : {}),
      ...(paymentType ? { paymentType } : { paymentType: 'CASH' as const }),
      ...(installments ? { installmentsCount: Number(installments[1]) } : {}),
      ...(name ? { name: name.slice(0, 160) } : {}),
      ...(dateFromText(lower, now) ? { date: dateFromText(lower, now) } : {}),
    };
  }
}
