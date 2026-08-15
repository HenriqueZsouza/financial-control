import type { ListTransactions } from '../../ports/inbound/transactions.js';
import type { TransactionRepository } from '../../ports/outbound/transaction-repository.js';
import type { FamilyRepository } from '../../ports/outbound/family-repository.js';
import { DomainError } from '../../../domain/shared/errors.js';
export class ListTransactionsUseCase implements ListTransactions {
  constructor(private readonly transactions: TransactionRepository, private readonly family?: FamilyRepository) {}
  async execute(userId: number, filters: Parameters<ListTransactions['execute']>[1]) {
    if (filters.scope !== 'family') return this.transactions.list(userId, filters);
    const userIds = await this.family?.activeMemberUserIds(userId);
    if (!userIds) throw new DomainError('FAMILY_SCOPE_FORBIDDEN', 'Você precisa participar de um grupo familiar ativo para usar este escopo.');
    return this.transactions.list(userId, { ...filters, userIds });
  }
}
