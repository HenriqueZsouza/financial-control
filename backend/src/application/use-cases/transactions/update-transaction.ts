import { DomainError, notFound } from '../../../domain/shared/errors.js';
import { atTimeOf } from '../../../domain/shared/period.js';
import type { UpdateTransaction, UpdateTransactionInput } from '../../ports/inbound/transactions.js';
import type { CategoryRepository } from '../../ports/outbound/category-repository.js';
import type { Clock } from '../../ports/outbound/security.js';
import type { TransactionRepository } from '../../ports/outbound/transaction-repository.js';

function isCalendarMidnight(date: Date) {
  return (
    date.getUTCHours() === 0 &&
    date.getUTCMinutes() === 0 &&
    date.getUTCSeconds() === 0 &&
    date.getUTCMilliseconds() === 0
  );
}

export class UpdateTransactionUseCase implements UpdateTransaction {
  constructor(
    private readonly transactions: TransactionRepository,
    private readonly categories: CategoryRepository,
    private readonly clock: Clock,
  ) {}

  async execute(userId: number, id: number, input: UpdateTransactionInput) {
    const current = await this.transactions.findActiveById(userId, id);
    if (!current) throw notFound('Lançamento');
    if (input.categoryId && !(await this.categories.exists(input.categoryId))) {
      throw new DomainError('INVALID_CATEGORY', 'A categoria informada não existe.');
    }
    if (current.installmentGroupId && (input.amount !== undefined || input.paymentType !== undefined)) {
      throw new DomainError('INSTALLMENT_RESTRICTION', 'Não é possível alterar valor ou pagamento de uma parcela.');
    }
    if (input.paymentType === 'INSTALLMENT') {
      throw new DomainError('PAYMENT_TYPE_RESTRICTION', 'Crie um novo lançamento para alterar para parcelado.');
    }

    const patch = { ...input };
    if (patch.date) {
      if (isCalendarMidnight(patch.date)) {
        patch.date = atTimeOf(patch.date, this.clock.now());
      }
    }

    return this.transactions.update(current.id, patch);
  }
}
