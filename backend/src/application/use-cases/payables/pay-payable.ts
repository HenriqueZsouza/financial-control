import { PAYABLE_PAYMENT_CATEGORY_SLUG } from '../../../domain/payable/payable.js';
import { DomainError, notFound } from '../../../domain/shared/errors.js';
import { atTimeOf } from '../../../domain/shared/period.js';
import type { PayPayable } from '../../ports/inbound/payables.js';
import type { CategoryRepository } from '../../ports/outbound/category-repository.js';
import type { PayableRepository } from '../../ports/outbound/payable-repository.js';
import type { Clock } from '../../ports/outbound/security.js';

function isCalendarMidnight(date: Date) {
  return (
    date.getUTCHours() === 0
    && date.getUTCMinutes() === 0
    && date.getUTCSeconds() === 0
    && date.getUTCMilliseconds() === 0
  );
}

export class PayPayableUseCase implements PayPayable {
  constructor(
    private readonly payables: PayableRepository,
    private readonly categories: CategoryRepository,
    private readonly clock: Clock,
  ) {}

  async execute(userId: number, payableId: number, input: { paidAt: Date }) {
    const payable = await this.payables.findActiveById(userId, payableId);
    if (!payable) {
      throw notFound('Conta a pagar');
    }
    if (payable.status !== 'PENDING') {
      throw new DomainError('PAYABLE_ALREADY_PAID', 'Esta conta já foi paga.');
    }

    const category = await this.categories.findBySlug(PAYABLE_PAYMENT_CATEGORY_SLUG);
    if (!category) {
      throw new DomainError('INVALID_CATEGORY', 'A categoria de pagamento não existe.');
    }

    const paidAt = isCalendarMidnight(input.paidAt)
      ? atTimeOf(input.paidAt, this.clock.now())
      : input.paidAt;

    return this.payables.pay({
      userId,
      payableId,
      paidAt,
      categoryId: category.id,
    });
  }
}
