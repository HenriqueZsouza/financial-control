import { PaymentType as PrismaPaymentType, TransactionType as PrismaTransactionType } from '@prisma/client';
import type { TransactionRepository, CreateTransactionData, TransactionFilters, UpdateTransactionData } from '../../../application/ports/outbound/transaction-repository.js';
import type { PaymentType, Transaction, TransactionType } from '../../../domain/transaction/transaction.js';
import { prisma } from './prisma-client.js';

const toPrismaType = (type: TransactionType): PrismaTransactionType => {
  switch (type) {
    case 'INCOME':
      return PrismaTransactionType.INCOME;
    case 'EXPENSE':
      return PrismaTransactionType.EXPENSE;
    case 'INVESTMENT':
      return PrismaTransactionType.INVESTMENT;
  }
};

const toPrismaPayment = (payment: PaymentType): PrismaPaymentType => {
  switch (payment) {
    case 'CASH':
      return PrismaPaymentType.CASH;
    case 'CREDIT_1X':
      return PrismaPaymentType.CREDIT_1X;
    case 'INSTALLMENT':
      return PrismaPaymentType.INSTALLMENT;
  }
};

const mapCreate = (data: CreateTransactionData) => ({
  ...data,
  type: toPrismaType(data.type),
  paymentType: toPrismaPayment(data.paymentType),
});

const mapUpdate = (data: UpdateTransactionData) => ({
  ...data,
  ...(data.type ? { type: toPrismaType(data.type) } : {}),
  ...(data.paymentType ? { paymentType: toPrismaPayment(data.paymentType) } : {}),
});

export class PrismaTransactionRepository implements TransactionRepository {
  create(data: CreateTransactionData): Promise<Transaction> {
    return prisma.transaction.create({ data: mapCreate(data), include: { category: true } });
  }

  async createMany(data: CreateTransactionData[]): Promise<Transaction[]> {
    return prisma.$transaction(data.map((entry) => prisma.transaction.create({
      data: mapCreate(entry),
      include: { category: true },
    })));
  }

  list(userId: number, filters: TransactionFilters): Promise<Transaction[]> {
    return prisma.transaction.findMany({
      where: {
        ...(filters.userIds ? { userId: { in: filters.userIds } } : { userId }),
        deletedAt: null,
        ...(filters.period ? { date: { gte: filters.period.start, lt: filters.period.end } } : {}),
        ...(filters.categoryIds?.length ? { categoryId: { in: filters.categoryIds } } : {}),
        ...(filters.type ? { type: toPrismaType(filters.type) } : {}),
        ...(filters.paymentTypes?.length
          ? { paymentType: { in: filters.paymentTypes.map(toPrismaPayment) } }
          : {}),
      },
      include: {
        category: true,
        ...(filters.userIds ? { user: { select: { id: true, firstName: true, lastName: true } } } : {}),
      },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    });
  }

  findActiveById(userId: number, id: number): Promise<Transaction | null> {
    return prisma.transaction.findFirst({
      where: { id, userId, deletedAt: null },
      include: { category: true },
    });
  }

  update(id: number, data: UpdateTransactionData): Promise<Transaction> {
    return prisma.transaction.update({
      where: { id },
      data: mapUpdate(data),
      include: { category: true },
    });
  }

  async softDelete(id: number, deletedAt: Date) {
    await prisma.transaction.update({ where: { id }, data: { deletedAt } });
  }

  async summary(userId: number, period: TransactionFilters['period']) {
    const where = { userId, deletedAt: null, date: { gte: period!.start, lt: period!.end } };
    const prior = { userId, deletedAt: null, date: { lt: period!.start } };
    const cashExpense = {
      type: PrismaTransactionType.EXPENSE,
      paymentType: PrismaPaymentType.CASH,
    };
    const [incomes, expenses, investments, groups, priorIncomes, priorExpenses] = await Promise.all([
      prisma.transaction.aggregate({
        where: { ...where, type: PrismaTransactionType.INCOME },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { ...where, ...cashExpense },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { ...where, type: PrismaTransactionType.INVESTMENT },
        _sum: { amount: true },
      }),
      prisma.transaction.groupBy({
        by: ['categoryId'],
        where: { ...where, ...cashExpense },
        _sum: { amount: true },
        orderBy: { _sum: { amount: 'desc' } },
      }),
      prisma.transaction.aggregate({
        where: { ...prior, type: PrismaTransactionType.INCOME },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { ...prior, ...cashExpense },
        _sum: { amount: true },
      }),
    ]);
    const categories = await prisma.category.findMany({
      where: { id: { in: groups.map((entry) => entry.categoryId) } },
      select: { id: true, name: true },
    });
    const names = new Map(categories.map((category) => [category.id, category.name]));
    return {
      totalIncome: incomes._sum.amount ?? 0,
      totalExpense: expenses._sum.amount ?? 0,
      totalInvestment: investments._sum.amount ?? 0,
      openingBalance: (priorIncomes._sum.amount ?? 0) - (priorExpenses._sum.amount ?? 0),
      byCategory: groups.map((entry) => ({
        categoryId: entry.categoryId,
        name: names.get(entry.categoryId) ?? 'Sem categoria',
        total: entry._sum.amount ?? 0,
      })),
    };
  }

  listOpenCreditCard(userId: number, now: Date): Promise<Transaction[]> {
    return prisma.transaction.findMany({
      where: {
        userId,
        deletedAt: null,
        payableId: null,
        paymentType: {
          in: [PrismaPaymentType.CREDIT_1X, PrismaPaymentType.INSTALLMENT],
        },
        date: { lte: now },
      },
      include: { category: true },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    });
  }
}
