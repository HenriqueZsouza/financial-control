import { DomainError } from '../../../domain/shared/errors.js';
import { creditCardInvoiceName } from '../../../domain/payable/payable.js';
import type { CloseCreditCardInvoice } from '../../ports/inbound/credit-card.js';
import type { PayableRepository } from '../../ports/outbound/payable-repository.js';
import type { Clock } from '../../ports/outbound/security.js';
import type { TransactionRepository } from '../../ports/outbound/transaction-repository.js';

export class CloseCreditCardInvoiceUseCase implements CloseCreditCardInvoice {
  constructor(
    private readonly transactions: TransactionRepository,
    private readonly payables: PayableRepository,
    private readonly clock: Clock,
  ) {}

  async execute(userId: number, input: { dueDate: Date }) {
    const now = this.clock.now();
    const items = await this.transactions.listOpenCreditCard(userId, now);
    if (!items.length) {
      throw new DomainError('EMPTY_OPEN_INVOICE', 'Não há compras em aberto para fechar a fatura.');
    }

    return this.payables.closeInvoice({
      userId,
      dueDate: input.dueDate,
      closedAt: now,
      name: creditCardInvoiceName(input.dueDate),
      transactionIds: items.map((item) => item.id),
    });
  }
}
