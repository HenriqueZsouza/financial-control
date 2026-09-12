import type { TelegramInterpreter } from '../../../application/ports/outbound/telegram.js';
import type { TelegramDraft } from '../../../domain/telegram/telegram.js';
import type { PaymentType } from '../../../domain/transaction/transaction.js';

function fold(text: string) {
  return text.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/\p{M}/gu, '');
}

function cents(value: string) {
  const number = Number(value.replace(',', '.'));
  return Number.isFinite(number) && number > 0 && number <= 9_999_999.99
    ? Math.round(number * 100)
    : undefined;
}

function dateFromText(text: string, now: Date) {
  if (/\bhoje\b/.test(text)) return now.toISOString();
  if (/\bontem\b/.test(text)) return new Date(now.getTime() - 86_400_000).toISOString();
  const match = text.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?\b/);
  if (!match) return undefined;
  const year = Number(match[3] ?? now.getUTCFullYear());
  const month = Number(match[2]);
  const day = Number(match[1]);
  const date = new Date(Date.UTC(year, month - 1, day, now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds()));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
    ? date.toISOString()
    : undefined;
}

function paymentFromText(text: string): { paymentType?: PaymentType; installmentsCount?: number } {
  const installments = text.match(/\b(\d{1,3})\s*x\b/) ?? text.match(/\bparcelad[oa](?:\s+em)?\s+(\d{1,3})\b/);
  const installmentsCount = installments ? Number(installments[1]) : undefined;
  if (installmentsCount && installmentsCount >= 2 && installmentsCount <= 120) {
    return { paymentType: 'INSTALLMENT', installmentsCount };
  }
  if (/\b(cartao|credito)\b/.test(text)) return { paymentType: 'CREDIT_1X' };
  if (/\b(vista|pix|dinheiro|debito)\b/.test(text)) return { paymentType: 'CASH' };
  return {};
}

function typeFromText(text: string, paymentType?: PaymentType): TelegramDraft['type'] {
  const income = /\b(recebi|receita|entrada|salario|venda|ganhei|rendimento)\b/.test(text);
  const expense = /\b(despesa|paguei|pago|comprei|compra|comprar|gastei|gasto)\b/.test(text);
  if (income && !expense) return 'INCOME';
  if (expense && !income) return 'EXPENSE';
  if (!income && (paymentType === 'CREDIT_1X' || paymentType === 'INSTALLMENT')) return 'EXPENSE';
  return undefined;
}

function amountFromText(text: string) {
  const withoutNoise = text
    .replace(/\b\d{1,3}\s*x\b/g, ' ')
    .replace(/\b\d{1,2}\/\d{1,2}(?:\/\d{4})?\b/g, ' ');
  const match = withoutNoise.match(/(?:r\$\s*)?(\d{1,9}(?:[.,]\d{1,2})?)/);
  return match ? cents(match[1]) : undefined;
}

function nameFromText(text: string) {
  const stripped = text
    .replace(/(?:r\$\s*)?\d{1,9}(?:[.,]\d{1,2})?\s*(?:reais?)?/g, ' ')
    .replace(/\b\d{1,3}\s*x\b/g, ' ')
    .replace(/\b\d{1,2}\/\d{1,2}(?:\/\d{4})?\b/g, ' ')
    .replace(/\b(hoje|ontem|cartao|credito|parcelad[oa]|vista|pix|dinheiro|debito|compra|comprei|comprar|paguei|pago|gastei|gasto|despesa|recebi|receita|entrada|venda|ganhei|rendimento)\b/g, ' ')
    .replace(/\b(no|na|nos|nas|do|da|dos|das|de|em|um|uma|uns|umas|por|para|com|num|numa|ao|e|ou)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[,;:.-]+|[,;:.-]+$/g, '');
  return stripped ? stripped.slice(0, 160) : undefined;
}

export class RuleBasedTelegramInterpreter implements TelegramInterpreter {
  interpret(input: string, now: Date): Partial<TelegramDraft> {
    const text = fold(input.trim());
    const payment = paymentFromText(text);
    const amount = amountFromText(text);
    const type = typeFromText(text, payment.paymentType);
    const name = nameFromText(text);
    const date = dateFromText(text, now);
    return {
      ...(amount ? { amount } : {}),
      ...(type ? { type } : {}),
      ...(payment.paymentType ? { paymentType: payment.paymentType } : {}),
      ...(payment.installmentsCount ? { installmentsCount: payment.installmentsCount } : {}),
      ...(name ? { name } : {}),
      ...(date ? { date } : {}),
    };
  }
}
