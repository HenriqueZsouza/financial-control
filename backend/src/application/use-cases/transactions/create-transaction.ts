import { DomainError } from '../../../domain/shared/errors.js';
import { atTimeOf } from '../../../domain/shared/period.js';
import { isSinglePayment, splitInstallments } from '../../../domain/transaction/transaction.js';
import type { CreateTransaction, CreateTransactionInput } from '../../ports/inbound/transactions.js';
import type { CategoryRepository } from '../../ports/outbound/category-repository.js';
import type { Clock, IdGenerator } from '../../ports/outbound/security.js';
import type { CreateTransactionData, TransactionRepository } from '../../ports/outbound/transaction-repository.js';

function isCalendarMidnight(date: Date) {
  return (
    date.getUTCHours() === 0 &&
    date.getUTCMinutes() === 0 &&
    date.getUTCSeconds() === 0 &&
    date.getUTCMilliseconds() === 0
  );
}

export class CreateTransactionUseCase implements CreateTransaction {
  constructor(
    private readonly transactions: TransactionRepository,
    private readonly categories: CategoryRepository,
    private readonly clock: Clock,
    private readonly ids: IdGenerator,
  ) {}

  async execute(userId: number, input: CreateTransactionInput) {
    if (!(await this.categories.exists(input.categoryId))) {
      throw new DomainError('INVALID_CATEGORY', 'A categoria informada não existe.');
    }

    const now = this.clock.now();
    const date = !input.date ? now : isCalendarMidnight(input.date) ? atTimeOf(input.date, now) : input.date;

    if (isSinglePayment(input.paymentType)) {
      return [
        await this.transactions.create({
          ...input,
          userId,
          date,
          installmentsCount: null,
          installmentGroupId: null,
          installmentNumber: null,
        }),
      ];
    }

    const count = input.installmentsCount!;
    const groupId = await this.ids.generate();
    const records: CreateTransactionData[] = splitInstallments(input.amount, count, date).map((installment) => ({
      userId,
      categoryId: input.categoryId,
      type: input.type,
      name: input.name,
      paymentType: 'INSTALLMENT',
      installmentsCount: count,
      installmentGroupId: groupId,
      ...installment,
    }));
    return this.transactions.createMany(records);
  }
}
