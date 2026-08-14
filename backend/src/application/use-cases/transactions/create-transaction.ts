import { DomainError } from '../../../domain/shared/errors.js';
import { todayUtc } from '../../../domain/shared/period.js';
import { splitInstallments } from '../../../domain/transaction/transaction.js';
import type { CreateTransaction, CreateTransactionInput } from '../../ports/inbound/transactions.js';
import type { CategoryRepository } from '../../ports/outbound/category-repository.js';
import type { Clock, IdGenerator } from '../../ports/outbound/security.js';
import type { CreateTransactionData, TransactionRepository } from '../../ports/outbound/transaction-repository.js';

export class CreateTransactionUseCase implements CreateTransaction {
  constructor(private readonly transactions: TransactionRepository, private readonly categories: CategoryRepository, private readonly clock: Clock, private readonly ids: IdGenerator) {}
  async execute(userId: string, input: CreateTransactionInput) {
    if (!(await this.categories.exists(input.categoryId))) throw new DomainError('INVALID_CATEGORY', 'A categoria informada não existe.');
    const date = input.date ?? todayUtc(this.clock.now());
    if (input.paymentType === 'CASH') {
      return [await this.transactions.create({ ...input, userId, date, installmentsCount: null, installmentGroupId: null, installmentNumber: null })];
    }
    const count = input.installmentsCount!;
    const groupId = this.ids.generate();
    const records: CreateTransactionData[] = splitInstallments(input.amount, count, date).map((installment) => ({
      userId, categoryId: input.categoryId, type: input.type, name: input.name, paymentType: 'INSTALLMENT', installmentsCount: count, installmentGroupId: groupId, ...installment,
    }));
    return this.transactions.createMany(records);
  }
}
