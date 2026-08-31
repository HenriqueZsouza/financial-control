import type { Period } from '../../../domain/shared/period.js';
import type { Payable } from '../../../domain/payable/payable.js';

export interface CloseInvoiceData {
  userId: number;
  dueDate: Date;
  closedAt: Date;
  name: string;
  transactionIds: number[];
}

export interface PayableRepository {
  closeInvoice(data: CloseInvoiceData): Promise<Payable>;
  list(userId: number, period: Period): Promise<Payable[]>;
}
