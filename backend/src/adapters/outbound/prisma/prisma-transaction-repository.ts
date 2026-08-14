import { PaymentType, TransactionType } from '@prisma/client';
import type { TransactionRepository, CreateTransactionData, TransactionFilters, UpdateTransactionData } from '../../../application/ports/outbound/transaction-repository.js';
import type { Transaction } from '../../../domain/transaction/transaction.js';
import { prisma } from './prisma-client.js';

const toPrismaType = (type: 'INCOME' | 'EXPENSE') => type === 'INCOME' ? TransactionType.INCOME : TransactionType.EXPENSE;
const toPrismaPayment = (payment: 'CASH' | 'INSTALLMENT') => payment === 'CASH' ? PaymentType.CASH : PaymentType.INSTALLMENT;
const mapCreate = (data: CreateTransactionData) => ({ ...data, type: toPrismaType(data.type), paymentType: toPrismaPayment(data.paymentType) });
const mapUpdate = (data: UpdateTransactionData) => ({ ...data, ...(data.type ? { type: toPrismaType(data.type) } : {}), ...(data.paymentType ? { paymentType: toPrismaPayment(data.paymentType) } : {}) });

export class PrismaTransactionRepository implements TransactionRepository {
  create(data: CreateTransactionData): Promise<Transaction> { return prisma.transaction.create({ data: mapCreate(data), include: { category: true } }); }
  async createMany(data: CreateTransactionData[]): Promise<Transaction[]> {
    return prisma.$transaction(data.map((entry) => prisma.transaction.create({ data: mapCreate(entry), include: { category: true } })));
  }
  list(userId: string, filters: TransactionFilters): Promise<Transaction[]> {
    return prisma.transaction.findMany({
      where: { userId, deletedAt: null, ...(filters.period ? { date: { gte: filters.period.start, lt: filters.period.end } } : {}), ...(filters.categoryIds?.length ? { categoryId: { in: filters.categoryIds } } : {}), ...(filters.type ? { type: toPrismaType(filters.type) } : {}) },
      include: { category: true }, orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    });
  }
  findActiveById(userId: string, id: string): Promise<Transaction | null> { return prisma.transaction.findFirst({ where: { id, userId, deletedAt: null }, include: { category: true } }); }
  update(id: string, data: UpdateTransactionData): Promise<Transaction> { return prisma.transaction.update({ where: { id }, data: mapUpdate(data), include: { category: true } }); }
  async softDelete(id: string, deletedAt: Date) { await prisma.transaction.update({ where: { id }, data: { deletedAt } }); }
  async summary(userId: string, period: TransactionFilters['period']) {
    const where = { userId, deletedAt: null, date: { gte: period!.start, lt: period!.end } };
    const [incomes, expenses, groups] = await Promise.all([
      prisma.transaction.aggregate({ where: { ...where, type: TransactionType.INCOME }, _sum: { amount: true } }),
      prisma.transaction.aggregate({ where: { ...where, type: TransactionType.EXPENSE }, _sum: { amount: true } }),
      prisma.transaction.groupBy({ by: ['categoryId'], where: { ...where, type: TransactionType.EXPENSE }, _sum: { amount: true }, orderBy: { _sum: { amount: 'desc' } } }),
    ]);
    const categories = await prisma.category.findMany({ where: { id: { in: groups.map((entry) => entry.categoryId) } }, select: { id: true, name: true } });
    const names = new Map(categories.map((category) => [category.id, category.name]));
    return { totalIncome: incomes._sum.amount ?? 0, totalExpense: expenses._sum.amount ?? 0, byCategory: groups.map((entry) => ({ categoryId: entry.categoryId, name: names.get(entry.categoryId) ?? 'Sem categoria', total: entry._sum.amount ?? 0 })) };
  }
}
