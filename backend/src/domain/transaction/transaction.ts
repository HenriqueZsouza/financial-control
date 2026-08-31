export type TransactionType = 'INCOME' | 'EXPENSE' | 'INVESTMENT';
export type PaymentType = 'CASH' | 'CREDIT_1X' | 'INSTALLMENT';
export type TransactionSource = 'WEB' | 'TELEGRAM';

export const isSinglePayment = (paymentType: PaymentType) => paymentType === 'CASH' || paymentType === 'CREDIT_1X';

/** Despesa em dinheiro: única que reduz saldo e entra em totalExpense / byCategory. */
export const isCashExpense = (type: TransactionType, paymentType: PaymentType) =>
  type === 'EXPENSE' && paymentType === 'CASH';

export interface Transaction {
  id: number;
  userId: number;
  categoryId: number;
  type: TransactionType;
  name: string;
  amount: number;
  paymentType: PaymentType;
  installmentsCount: number | null;
  installmentGroupId: number | null;
  installmentNumber: number | null;
  date: Date;
  payableId: number | null;
  source?: TransactionSource;
  externalReference?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  category?: import('../category/category.js').Category;
  member?: { id: number; firstName: string; lastName: string };
}

export interface InstallmentDraft { amount: number; installmentNumber: number; date: Date }

export function splitInstallments(amount: number, count: number, date: Date): InstallmentDraft[] {
  const base = Math.floor(amount / count);
  const remainder = amount % count;
  return Array.from({ length: count }, (_, index) => ({
    amount: index === count - 1 ? base + remainder : base,
    installmentNumber: index + 1,
    date: new Date(Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth() + index,
      date.getUTCDate(),
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
      date.getUTCMilliseconds(),
    )),
  }));
}
