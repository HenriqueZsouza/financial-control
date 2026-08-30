import type { TransactionType } from './types';

export function transactionTypeLabel(type: TransactionType) {
  if (type === 'INCOME') return 'Entrada';
  if (type === 'INVESTMENT') return 'Investimento';
  return 'Despesa';
}

export function transactionAmountTone(type: TransactionType): 'income' | 'expense' | 'plain' {
  if (type === 'INCOME') return 'income';
  if (type === 'INVESTMENT') return 'plain';
  return 'expense';
}

export function transactionAmountSign(type: TransactionType): '+' | '−' | undefined {
  if (type === 'INCOME') return '+';
  if (type === 'INVESTMENT') return undefined;
  return '−';
}
