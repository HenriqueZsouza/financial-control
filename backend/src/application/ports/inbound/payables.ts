import type { Period } from '../../../domain/shared/period.js';
import type { Payable } from '../../../domain/payable/payable.js';

export interface PayableList {
  period: { month: number; year: number };
  totalAmount: number;
  count: number;
  items: Payable[];
}

export interface ListPayables {
  execute(userId: number, period?: Period): Promise<PayableList>;
}
