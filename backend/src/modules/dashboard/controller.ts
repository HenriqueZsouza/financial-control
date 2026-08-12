import type { NextFunction, Request, Response } from 'express';
import { TransactionType } from '@prisma/client';
import { AppError } from '../../shared/http';
import { prisma } from '../../shared/prisma';

export async function summary(req: Request, res: Response, next: NextFunction) {
  try {
    const now = new Date();
    const month = req.query.month === undefined ? now.getMonth() + 1 : Number(req.query.month);
    const year = req.query.year === undefined ? now.getFullYear() : Number(req.query.year);
    if (!Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(year) || year < 2000 || year > 9999) {
      throw new AppError(400, 'INVALID_PERIOD', 'Mês e ano devem formar um período válido.');
    }
    const date = { gte: new Date(Date.UTC(year, month - 1, 1)), lt: new Date(Date.UTC(year, month, 1)) };
    const where = { userId: req.userId!, deletedAt: null, date };
    const [incomes, expenses, expenseGroups] = await Promise.all([
      prisma.transaction.aggregate({ where: { ...where, type: TransactionType.INCOME }, _sum: { amount: true } }),
      prisma.transaction.aggregate({ where: { ...where, type: TransactionType.EXPENSE }, _sum: { amount: true } }),
      prisma.transaction.groupBy({ by: ['categoryId'], where: { ...where, type: TransactionType.EXPENSE }, _sum: { amount: true }, orderBy: { _sum: { amount: 'desc' } } }),
    ]);
    const categories = await prisma.category.findMany({ where: { id: { in: expenseGroups.map((entry) => entry.categoryId) } }, select: { id: true, name: true } });
    const names = new Map(categories.map((category) => [category.id, category.name]));
    const totalIncome = incomes._sum.amount ?? 0;
    const totalExpense = expenses._sum.amount ?? 0;
    return res.json({
      period: { month, year }, totalIncome, totalExpense, balance: totalIncome - totalExpense,
      byCategory: expenseGroups.map((entry) => ({ categoryId: entry.categoryId, name: names.get(entry.categoryId) ?? 'Sem categoria', total: entry._sum.amount ?? 0 })),
    });
  } catch (error) { return next(error); }
}
