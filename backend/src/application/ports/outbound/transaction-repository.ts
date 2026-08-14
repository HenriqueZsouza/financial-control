import type { Period } from '../../../domain/shared/period.js';
import type { PaymentType, Transaction, TransactionType } from '../../../domain/transaction/transaction.js';

export interface CreateTransactionData {
  userId: string; categoryId: string; type: TransactionType; name: string; amount: number; paymentType: PaymentType;
  installmentsCount: number | null; installmentGroupId: string | null; installmentNumber: number | null; date: Date;
}
export interface TransactionFilters { period?: Period; categoryIds?: string[]; type?: TransactionType }
export interface UpdateTransactionData { type?: TransactionType; name?: string; amount?: number; categoryId?: string; paymentType?: PaymentType; date?: Date }
export interface CategoryTotal { categoryId: string; name: string; total: number }
export interface TransactionRepository {
  create(data: CreateTransactionData): Promise<Transaction>;
  createMany(data: CreateTransactionData[]): Promise<Transaction[]>;
  list(userId: string, filters: TransactionFilters): Promise<Transaction[]>;
  findActiveById(userId: string, id: string): Promise<Transaction | null>;
  update(id: string, data: UpdateTransactionData): Promise<Transaction>;
  softDelete(id: string, deletedAt: Date): Promise<void>;
  summary(userId: string, period: Period): Promise<{ totalIncome: number; totalExpense: number; byCategory: CategoryTotal[] }>;
}
