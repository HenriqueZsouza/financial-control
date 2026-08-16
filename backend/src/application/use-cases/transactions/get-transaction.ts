import { notFound } from '../../../domain/shared/errors.js';
import type { GetTransaction } from '../../ports/inbound/transactions.js';
import type { TransactionRepository } from '../../ports/outbound/transaction-repository.js';
export class GetTransactionUseCase implements GetTransaction {
  constructor(private readonly transactions: TransactionRepository) {}
  async execute(userId: number, id: number) {
    const transaction = await this.transactions.findActiveById(userId, id);
    if (!transaction) throw notFound('Lançamento');
    return transaction;
  }
}
