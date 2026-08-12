export type User = { id: string; firstName: string; lastName: string; email: string; phone: string; createdAt: string; updatedAt?: string };
export type Category = { id: string; name: string; slug: string; icon?: string | null };
export type TransactionType = 'INCOME' | 'EXPENSE';
export type PaymentType = 'CASH' | 'INSTALLMENT';
export type Transaction = { id: string; name: string; amount: number; type: TransactionType; paymentType: PaymentType; installmentsCount?: number | null; installmentGroupId?: string | null; installmentNumber?: number | null; date: string; categoryId: string; category: Category; createdAt: string };
export type Summary = { period: { month: number; year: number }; totalIncome: number; totalExpense: number; balance: number; byCategory: { categoryId: string; name: string; total: number }[] };
