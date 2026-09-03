import { periodOf } from '../../../domain/shared/period.js';
import type { GetCreditCardReport } from '../../ports/inbound/credit-card.js';
import type { PayableRepository } from '../../ports/outbound/payable-repository.js';
import type { Clock } from '../../ports/outbound/security.js';
import type { TransactionRepository } from '../../ports/outbound/transaction-repository.js';

export class GetCreditCardReportUseCase implements GetCreditCardReport {
  constructor(
    private readonly transactions: TransactionRepository,
    private readonly payables: PayableRepository,
    private readonly clock: Clock,
  ) {}

  async execute(userId: number, period?: Parameters<GetCreditCardReport['execute']>[1]) {
    const now = this.clock.now();
    const selected = period ?? periodOf(now.getUTCMonth() + 1, now.getUTCFullYear());
    const closedItems = await this.transactions.listClosedCreditCardByDuePeriod(userId, selected);
    const latestInvoice = await this.payables.findLatestCreditCardInvoice(userId);
    const openInvoicePeriod = latestInvoice
      ? periodAfter(latestInvoice.dueDate)
      : periodOf(now.getUTCMonth() + 1, now.getUTCFullYear());
    const openItems = selected.month === openInvoicePeriod.month && selected.year === openInvoicePeriod.year
      ? await this.transactions.listOpenCreditCard(userId, now)
      : [];
    const items = [...closedItems, ...openItems];
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

function periodAfter(date: Date) {
  const month = date.getUTCMonth() + 1;
  return periodOf(month === 12 ? 1 : month + 1, month === 12 ? date.getUTCFullYear() + 1 : date.getUTCFullYear());
}
