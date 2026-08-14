import type { ListTransactions } from '../../ports/inbound/transactions.js';
import type { TransactionRepository } from '../../ports/outbound/transaction-repository.js';
export class ListTransactionsUseCase implements ListTransactions {
  constructor(private readonly transactions: TransactionRepository) {}
  execute(userId: string, filters: Parameters<ListTransactions['execute']>[1]) { return this.transactions.list(userId, filters); }
}
