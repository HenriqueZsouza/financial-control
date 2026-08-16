import { DomainError, notFound } from '../../../domain/shared/errors.js';
import type { UpdateTransaction, UpdateTransactionInput } from '../../ports/inbound/transactions.js';
import type { CategoryRepository } from '../../ports/outbound/category-repository.js';
import type { TransactionRepository } from '../../ports/outbound/transaction-repository.js';

export class UpdateTransactionUseCase implements UpdateTransaction {
  constructor(private readonly transactions: TransactionRepository, private readonly categories: CategoryRepository) {}
  async execute(userId: number, id: number, input: UpdateTransactionInput) {
    const current = await this.transactions.findActiveById(userId, id);
    if (!current) throw notFound('Lançamento');
    if (input.categoryId && !(await this.categories.exists(input.categoryId))) throw new DomainError('INVALID_CATEGORY', 'A categoria informada não existe.');
    if (current.installmentGroupId && (input.amount !== undefined || input.paymentType !== undefined)) {
      throw new DomainError('INSTALLMENT_RESTRICTION', 'Não é possível alterar valor ou pagamento de uma parcela.');
    }
    if (input.paymentType === 'INSTALLMENT') throw new DomainError('PAYMENT_TYPE_RESTRICTION', 'Crie um novo lançamento para alterar para parcelado.');
    return this.transactions.update(current.id, input);
  }
}
