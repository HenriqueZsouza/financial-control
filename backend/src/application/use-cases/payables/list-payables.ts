import { periodOf } from '../../../domain/shared/period.js';
import type { ListPayables } from '../../ports/inbound/payables.js';
import type { PayableRepository } from '../../ports/outbound/payable-repository.js';
import type { Clock } from '../../ports/outbound/security.js';

export class ListPayablesUseCase implements ListPayables {
  constructor(
    private readonly payables: PayableRepository,
    private readonly clock: Clock,
  ) {}

  async execute(userId: number, period?: Parameters<ListPayables['execute']>[1]) {
    const now = this.clock.now();
    const selected = period ?? periodOf(now.getUTCMonth() + 1, now.getUTCFullYear());
    const items = await this.payables.list(userId, selected);
    const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);

    return {
      period: { month: selected.month, year: selected.year },
      totalAmount,
      count: items.length,
      items,
    };
  }
}
