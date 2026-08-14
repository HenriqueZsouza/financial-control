import type { Period } from '../../../domain/shared/period.js';
import type { PaymentType, Transaction, TransactionType } from '../../../domain/transaction/transaction.js';

export interface CreateTransactionInput { type: TransactionType; name: string; amount: number; categoryId: string; paymentType: PaymentType; installmentsCount?: number; date?: Date }
export interface ListTransactionsFilters { period?: Period; categoryIds?: string[]; type?: TransactionType }
export interface UpdateTransactionInput { type?: TransactionType; name?: string; amount?: number; categoryId?: string; paymentType?: PaymentType; date?: Date }
export interface CreateTransaction { execute(userId: string, input: CreateTransactionInput): Promise<Transaction[]> }
export interface ListTransactions { execute(userId: string, filters: ListTransactionsFilters): Promise<Transaction[]> }
export interface GetTransaction { execute(userId: string, id: string): Promise<Transaction> }
export interface UpdateTransaction { execute(userId: string, id: string, input: UpdateTransactionInput): Promise<Transaction> }
export interface DeleteTransaction { execute(userId: string, id: string): Promise<void> }
