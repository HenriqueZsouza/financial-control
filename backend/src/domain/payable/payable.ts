export type PayableSource = 'CREDIT_CARD_INVOICE';
export type PayableStatus = 'PENDING';

export interface Payable {
  id: number;
  userId: number;
  name: string;
  amount: number;
  dueDate: Date;
  source: PayableSource;
  status: PayableStatus;
  closedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export function creditCardInvoiceName(dueDate: Date): string {
  const day = String(dueDate.getUTCDate()).padStart(2, '0');
  const month = String(dueDate.getUTCMonth() + 1).padStart(2, '0');
  const year = dueDate.getUTCFullYear();
  return `Fatura do cartão · venc. ${day}/${month}/${year}`;
}
