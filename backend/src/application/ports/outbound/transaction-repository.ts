import type { Period } from '../../../domain/shared/period.js';
import type { PaymentType, Transaction, TransactionType } from '../../../domain/transaction/transaction.js';

export interface CreateTransactionData {
  userId: number; categoryId: number; type: TransactionType; name: string; amount: number; paymentType: PaymentType;
  installmentsCount: number | null; installmentGroupId: number | null; installmentNumber: number | null; date: Date;
}
export interface TransactionFilters { period?: Period; categoryIds?: number[]; type?: TransactionType }
export interface UpdateTransactionData { type?: TransactionType; name?: string; amount?: number; categoryId?: number; paymentType?: PaymentType; date?: Date }
export interface CategoryTotal { categoryId: number; name: string; total: number }
export interface TransactionRepository {
  create(data: CreateTransactionData): Promise<Transaction>;
  createMany(data: CreateTransactionData[]): Promise<Transaction[]>;
  list(userId: number, filters: TransactionFilters): Promise<Transaction[]>;
  findActiveById(userId: number, id: number): Promise<Transaction | null>;
  update(id: number, data: UpdateTransactionData): Promise<Transaction>;
  softDelete(id: number, deletedAt: Date): Promise<void>;
  summary(userId: number, period: Period): Promise<{ totalIncome: number; totalExpense: number; byCategory: CategoryTotal[] }>;
}
