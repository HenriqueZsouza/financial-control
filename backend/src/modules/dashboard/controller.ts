import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getDashboardSummaryHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;
    const { month, year } = req.query;

    // Determine the month and year to query
    const now = new Date();
    const targetMonth = month ? parseInt(month as string, 10) : now.getMonth() + 1; // 1-12
    const targetYear = year ? parseInt(year as string, 10) : now.getFullYear();

    // Validate month
    if (isNaN(targetMonth) || targetMonth < 1 || targetMonth > 12) {
      return res.status(400).json({ error: 'Invalid month' });
    }
    if (isNaN(targetYear)) {
      return res.status(400).json({ error: 'Invalid year' });
    }

    // Start and end of the month
    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 1); // first day of next month

    // Aggregate income and expense
    const [incomeResult, expenseResult, expenseByCategory] = await Promise.all([
      prisma.transaction.aggregate({
        where: {
          userId,
          type: 'INCOME',
          date: {
            gte: startDate,
            lt: endDate,
          },
          deletedAt: null,
        },
        _sum: {
          amount: true,
        },
      }),
      prisma.transaction.aggregate({
        where: {
          userId,
          type: 'EXPENSE',
          date: {
            gte: startDate,
            lt: endDate,
          },
          deletedAt: null,
        },
        _sum: {
          amount: true,
        },
      }),
      prisma.transaction.groupBy({
        by: ['categoryId'],
        where: {
          userId,
          type: 'EXPENSE',
          date: {
            gte: startDate,
            lt: endDate,
          },
          deletedAt: null,
        },
        _sum: {
          amount: true,
        },
        orderBy: {
          _sum: {
            amount: 'desc',
          },
        },
      }),
    ]);

    // Get category names for the expense breakdown
    const categoryIds = expenseByCategory.map((group) => group.categoryId);
    const categories = await prisma.category.findMany({
      where: {
        id: {
          in: categoryIds,
        },
      },
      select: {
        id: true,
        name: true,
      },
    });

    const categoryMap = new Map<string, string>();
    categories.forEach((cat) => {
      categoryMap.set(cat.id, cat.name);
    });

    const byCategory = expenseByCategory
      .map((group) => ({
        categoryId: group.categoryId,
        name: categoryMap.get(group.categoryId) || 'Unknown',
        total: group._sum.amount || 0,
      }))
      .filter((item) => item.total > 0); // just in case

    const totalIncome = incomeResult._sum.amount || 0;
    const totalExpense = expenseResult._sum.amount || 0;
    const balance = totalIncome - totalExpense;

    res.json({
      totalIncome,
      totalExpense,
      balance,
      byCategory,
    });
  } catch (error) {
    next(error);
  }
};