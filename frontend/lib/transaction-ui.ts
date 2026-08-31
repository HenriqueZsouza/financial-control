import type { PaymentType, TransactionType } from './types';

export function transactionTypeLabel(type: TransactionType) {
  if (type === 'INCOME') return 'Entrada';
  if (type === 'INVESTMENT') return 'Investimento';
  return 'Despesa';
}

export function isCreditPayment(paymentType: PaymentType) {
  return paymentType === 'CREDIT_1X' || paymentType === 'INSTALLMENT';
}

export function transactionAmountTone(
  type: TransactionType,
  paymentType?: PaymentType,
): 'income' | 'expense' | 'plain' {
  if (type === 'INCOME') return 'income';
  if (type === 'INVESTMENT' || (paymentType && isCreditPayment(paymentType))) return 'plain';
  return 'expense';
}

export function transactionAmountSign(
  type: TransactionType,
  paymentType?: PaymentType,
): '+' | '−' | undefined {
  if (type === 'INCOME') return '+';
  if (type === 'INVESTMENT' || (paymentType && isCreditPayment(paymentType))) return undefined;
  return '−';
}
