import type { Period } from '../../../domain/shared/period.js';
import type { Payable } from '../../../domain/payable/payable.js';

export interface CloseInvoiceData {
  userId: number;
  dueDate: Date;
  closedAt: Date;
  name: string;
  transactionIds: number[];
}

export interface PayPayableData {
  userId: number;
  payableId: number;
  paidAt: Date;
  categoryId: number;
}

export interface PayableRepository {
  closeInvoice(data: CloseInvoiceData): Promise<Payable>;
  findLatestCreditCardInvoice(userId: number): Promise<Payable | null>;
  findActiveById(userId: number, id: number): Promise<Payable | null>;
  list(userId: number, period: Period): Promise<Payable[]>;
  pay(data: PayPayableData): Promise<Payable>;
}
