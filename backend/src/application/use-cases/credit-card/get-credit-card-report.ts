import { periodOf } from '../../../domain/shared/period.js';
import type { GetCreditCardReport } from '../../ports/inbound/credit-card.js';
import type { Clock } from '../../ports/outbound/security.js';
import type { TransactionRepository } from '../../ports/outbound/transaction-repository.js';

export class GetCreditCardReportUseCase implements GetCreditCardReport {
  constructor(
    private readonly transactions: TransactionRepository,
    private readonly clock: Clock,
  ) {}

  async execute(userId: number, period?: Parameters<GetCreditCardReport['execute']>[1]) {
    const now = this.clock.now();
    const selected = period ?? periodOf(now.getUTCMonth() + 1, now.getUTCFullYear());
    const items = await this.transactions.list(userId, {
      period: selected,
      paymentTypes: ['CREDIT_1X', 'INSTALLMENT'],
    });
    const credit1x = items.filter((item) => item.paymentType === 'CREDIT_1X');
    const installments = items.filter((item) => item.paymentType === 'INSTALLMENT');
    const totalCredit1x = credit1x.reduce((sum, item) => sum + item.amount, 0);
    const totalInstallment = installments.reduce((sum, item) => sum + item.amount, 0);

    return {
      period: { month: selected.month, year: selected.year },
      totalCredit1x,
      totalInstallment,
      total: totalCredit1x + totalInstallment,
      credit1xCount: credit1x.length,
      installmentCount: installments.length,
      credit1x,
      installments,
    };
  }
}
