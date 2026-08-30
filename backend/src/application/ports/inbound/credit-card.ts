import type { Period } from '../../../domain/shared/period.js';
import type { Payable } from '../../../domain/payable/payable.js';
import type { Transaction } from '../../../domain/transaction/transaction.js';

export interface CreditCardReport {
  period: { month: number; year: number };
  totalCredit1x: number;
  totalInstallment: number;
  total: number;
  credit1xCount: number;
  installmentCount: number;
  credit1x: Transaction[];
  installments: Transaction[];
}

export interface GetCreditCardReport {
  execute(userId: number, period?: Period): Promise<CreditCardReport>;
}

export interface OpenCreditCardInvoice {
  total: number;
  totalCredit1x: number;
  totalInstallment: number;
  credit1xCount: number;
  installmentCount: number;
  itemCount: number;
}

export interface GetOpenCreditCardInvoice {
  execute(userId: number): Promise<OpenCreditCardInvoice>;
}

export interface CloseCreditCardInvoice {
  execute(userId: number, input: { dueDate: Date }): Promise<Payable>;
}
