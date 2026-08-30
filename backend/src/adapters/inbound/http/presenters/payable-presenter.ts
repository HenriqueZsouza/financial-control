import type { Payable } from '../../../../domain/payable/payable.js';

function toCalendarDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function presentPayable(payable: Payable) {
  return {
    id: payable.id,
    name: payable.name,
    amount: payable.amount,
    dueDate: toCalendarDate(payable.dueDate),
    source: payable.source,
    status: payable.status,
    closedAt: payable.closedAt.toISOString(),
    createdAt: payable.createdAt.toISOString(),
  };
}
