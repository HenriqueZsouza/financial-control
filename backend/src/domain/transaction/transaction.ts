export type TransactionType = 'INCOME' | 'EXPENSE';
export type PaymentType = 'CASH' | 'INSTALLMENT';

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
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  category?: import('../category/category.js').Category;
}

export interface InstallmentDraft { amount: number; installmentNumber: number; date: Date }

export function splitInstallments(amount: number, count: number, date: Date): InstallmentDraft[] {
  const base = Math.floor(amount / count);
  const remainder = amount % count;
  return Array.from({ length: count }, (_, index) => ({
    amount: index === count - 1 ? base + remainder : base,
    installmentNumber: index + 1,
    date: new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + index, date.getUTCDate())),
  }));
}
