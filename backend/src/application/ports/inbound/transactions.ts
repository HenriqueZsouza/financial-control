import type { Period } from '../../../domain/shared/period.js';
import type { PaymentType, Transaction, TransactionType } from '../../../domain/transaction/transaction.js';

export interface CreateTransactionInput { type: TransactionType; name: string; amount: number; categoryId: number; paymentType: PaymentType; installmentsCount?: number; date?: Date }
export interface ListTransactionsFilters { period?: Period; categoryIds?: number[]; type?: TransactionType }
export interface UpdateTransactionInput { type?: TransactionType; name?: string; amount?: number; categoryId?: number; paymentType?: PaymentType; date?: Date }
export interface CreateTransaction { execute(userId: number, input: CreateTransactionInput): Promise<Transaction[]> }
export interface ListTransactions { execute(userId: number, filters: ListTransactionsFilters): Promise<Transaction[]> }
export interface GetTransaction { execute(userId: number, id: number): Promise<Transaction> }
export interface UpdateTransaction { execute(userId: number, id: number, input: UpdateTransactionInput): Promise<Transaction> }
export interface DeleteTransaction { execute(userId: number, id: number): Promise<void> }
