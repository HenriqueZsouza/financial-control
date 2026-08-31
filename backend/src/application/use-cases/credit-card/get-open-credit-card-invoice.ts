import type { GetOpenCreditCardInvoice, OpenCreditCardInvoice } from '../../ports/inbound/credit-card.js';
import type { Clock } from '../../ports/outbound/security.js';
import type { TransactionRepository } from '../../ports/outbound/transaction-repository.js';

export class GetOpenCreditCardInvoiceUseCase implements GetOpenCreditCardInvoice {
  constructor(
    private readonly transactions: TransactionRepository,
    private readonly clock: Clock,
  ) {}

  async execute(userId: number): Promise<OpenCreditCardInvoice> {
    const items = await this.transactions.listOpenCreditCard(userId, this.clock.now());
    const credit1x = items.filter((item) => item.paymentType === 'CREDIT_1X');
    const installments = items.filter((item) => item.paymentType === 'INSTALLMENT');
    const totalCredit1x = credit1x.reduce((sum, item) => sum + item.amount, 0);
    const totalInstallment = installments.reduce((sum, item) => sum + item.amount, 0);

    return {
      total: totalCredit1x + totalInstallment,
      totalCredit1x,
      totalInstallment,
      credit1xCount: credit1x.length,
      installmentCount: installments.length,
      itemCount: items.length,
    };
  }
}
