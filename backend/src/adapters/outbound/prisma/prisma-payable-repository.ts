import {
  PayableSource as PrismaPayableSource,
  PayableStatus as PrismaPayableStatus,
  PaymentType as PrismaPaymentType,
  TransactionSource as PrismaTransactionSource,
  TransactionType as PrismaTransactionType,
} from '@prisma/client';
import { DomainError } from '../../../domain/shared/errors.js';
import type { Payable, PayableSource, PayableStatus } from '../../../domain/payable/payable.js';
import type {
  CloseInvoiceData,
  PayPayableData,
  PayableRepository,
} from '../../../application/ports/outbound/payable-repository.js';
import { prisma } from './prisma-client.js';

const toDomainSource = (source: PrismaPayableSource): PayableSource => {
  switch (source) {
    case PrismaPayableSource.CREDIT_CARD_INVOICE:
      return 'CREDIT_CARD_INVOICE';
  }
};

const toDomainStatus = (status: PrismaPayableStatus): PayableStatus => {
  switch (status) {
    case PrismaPayableStatus.PENDING:
      return 'PENDING';
    case PrismaPayableStatus.PAID:
      return 'PAID';
  }
};

const toDomain = (row: {
  id: number;
  userId: number;
  name: string;
  amount: number;
  dueDate: Date;
  source: PrismaPayableSource;
  status: PrismaPayableStatus;
  closedAt: Date;
  paidAt: Date | null;
  paymentTransactionId: number | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}): Payable => ({
  id: row.id,
  userId: row.userId,
  name: row.name,
  amount: row.amount,
  dueDate: row.dueDate,
  source: toDomainSource(row.source),
  status: toDomainStatus(row.status),
  closedAt: row.closedAt,
  paidAt: row.paidAt,
  paymentTransactionId: row.paymentTransactionId,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
  deletedAt: row.deletedAt,
});

export class PrismaPayableRepository implements PayableRepository {
  async closeInvoice(data: CloseInvoiceData): Promise<Payable> {
    return prisma.$transaction(async (tx) => {
      const items = await tx.transaction.findMany({
        where: {
          id: { in: data.transactionIds },
          userId: data.userId,
          deletedAt: null,
          payableId: null,
        },
      });
      if (!items.length) {
        throw new DomainError('EMPTY_OPEN_INVOICE', 'Não há compras em aberto para fechar a fatura.');
      }

      const amount = items.reduce((sum, item) => sum + item.amount, 0);
      const payable = await tx.payable.create({
        data: {
          userId: data.userId,
          name: data.name,
          amount,
          dueDate: data.dueDate,
          source: PrismaPayableSource.CREDIT_CARD_INVOICE,
          status: PrismaPayableStatus.PENDING,
          closedAt: data.closedAt,
        },
      });

      await tx.transaction.updateMany({
        where: { id: { in: items.map((item) => item.id) } },
        data: { payableId: payable.id },
      });

      return toDomain(payable);
    });
  }

  async findActiveById(userId: number, id: number): Promise<Payable | null> {
    const payable = await prisma.payable.findFirst({
      where: { id, userId, deletedAt: null },
    });
    return payable ? toDomain(payable) : null;
  }

  async pay(data: PayPayableData): Promise<Payable> {
    return prisma.$transaction(async (tx) => {
      const current = await tx.payable.findFirst({
        where: {
          id: data.payableId,
          userId: data.userId,
          deletedAt: null,
        },
      });
      if (!current) {
        throw new DomainError('NOT_FOUND', 'Conta a pagar não encontrada.');
      }
      if (current.status !== PrismaPayableStatus.PENDING) {
        throw new DomainError('PAYABLE_ALREADY_PAID', 'Esta conta já foi paga.');
      }

      const transaction = await tx.transaction.create({
        data: {
          userId: data.userId,
          categoryId: data.categoryId,
          type: PrismaTransactionType.EXPENSE,
          name: current.name,
          amount: current.amount,
          paymentType: PrismaPaymentType.CASH,
          date: data.paidAt,
          source: PrismaTransactionSource.WEB,
        },
      });

      const paid = await tx.payable.update({
        where: { id: current.id },
        data: {
          status: PrismaPayableStatus.PAID,
          paidAt: data.paidAt,
          paymentTransactionId: transaction.id,
        },
      });

      return toDomain(paid);
    });
  }

  async findLatestCreditCardInvoice(userId: number): Promise<Payable | null> {
    const payable = await prisma.payable.findFirst({
      where: {
        userId,
        deletedAt: null,
        source: PrismaPayableSource.CREDIT_CARD_INVOICE,
      },
      orderBy: [{ closedAt: 'desc' }, { id: 'desc' }],
    });
    return payable ? toDomain(payable) : null;
  }

  async list(userId: number, period: { start: Date; end: Date }): Promise<Payable[]> {
    const rows = await prisma.payable.findMany({
      where: {
        userId,
        deletedAt: null,
        dueDate: { gte: period.start, lt: period.end },
      },
      orderBy: [{ dueDate: 'asc' }, { id: 'asc' }],
    });
    return rows.map(toDomain);
  }
}
