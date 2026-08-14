import { periodOf } from '../../../domain/shared/period.js';
import type { GetDashboardSummary } from '../../ports/inbound/dashboard.js';
import type { Clock } from '../../ports/outbound/security.js';
import type { TransactionRepository } from '../../ports/outbound/transaction-repository.js';
export class GetDashboardSummaryUseCase implements GetDashboardSummary {
  constructor(private readonly transactions: TransactionRepository, private readonly clock: Clock) {}
  async execute(userId: string, period?: Parameters<GetDashboardSummary['execute']>[1]) {
    const now = this.clock.now();
    const selected = period ?? periodOf(now.getUTCMonth() + 1, now.getUTCFullYear());
    const data = await this.transactions.summary(userId, selected);
    return { period: { month: selected.month, year: selected.year }, ...data, balance: data.totalIncome - data.totalExpense };
  }
}
