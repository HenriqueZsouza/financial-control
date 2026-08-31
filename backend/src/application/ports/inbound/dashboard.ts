import type { Period } from '../../../domain/shared/period.js';
import type { CategoryTotal } from '../outbound/transaction-repository.js';
export interface Summary {
  period: { month: number; year: number };
  openingBalance: number;
  totalIncome: number;
  totalExpense: number;
  totalInvestment: number;
  balance: number;
  byCategory: CategoryTotal[];
}
export interface GetDashboardSummary { execute(userId: number, period?: Period): Promise<Summary> }
