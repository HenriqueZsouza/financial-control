import { DomainError, notFound } from '../../../domain/shared/errors.js';
import type { DeleteTransaction } from '../../ports/inbound/transactions.js';
import type { Clock } from '../../ports/outbound/security.js';
import type { TransactionRepository } from '../../ports/outbound/transaction-repository.js';
export class DeleteTransactionUseCase implements DeleteTransaction {
  constructor(private readonly transactions: TransactionRepository, private readonly clock: Clock) {}
  async execute(userId: number, id: number) {
    const transaction = await this.transactions.findActiveById(userId, id);
    if (!transaction) throw notFound('Lançamento');
    if (transaction.payableId) {
      throw new DomainError('INVOICE_LOCKED', 'Este lançamento já faz parte de uma fatura fechada.');
    }
    await this.transactions.softDelete(transaction.id, this.clock.now());
  }
}
