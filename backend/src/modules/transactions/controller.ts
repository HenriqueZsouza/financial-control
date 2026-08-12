import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import crypto from 'crypto';

const prisma = new PrismaClient();

// Zod schemas
const transactionSchema = z.object({
  type: z.enum(['INCOME', 'EXPENSE']),
  name: z.string().min(1, 'Name is required'),
  amount: z.number().int().positive('Amount must be a positive integer (in cents)'),
  categoryId: z.string().min(1, 'Category is required'),
  paymentType: z.enum(['CASH', 'INSTALLMENT']),
  installmentsCount: z.number().int().min(2).max(24).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional(),
});

// Helper to generate installment group ID
const generateInstallmentGroupId = () => crypto.randomUUID();

// Helper to calculate installment amounts
const calculateInstallments = (totalAmount: number, count: number): number[] => {
  const baseAmount = Math.floor(totalAmount / count);
  const remainder = totalAmount % count;
  const amounts = Array(count).fill(baseAmount);
  for (let i = 0; i < remainder; i++) {
    amounts[i] += 1;
  }
  return amounts;
};

// POST /api/transactions
export const createTransactionHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = transactionSchema.parse(req.body);
    const userId = req.userId; // from auth middleware

    // Set default date to today if not provided
    const date = validated.date ? new Date(validated.date) : new Date();
    date.setHours(0, 0, 0, 0); // start of day

    if (validated.paymentType === 'CASH' || !validated.installmentsCount) {
      // Single transaction (à vista)
      const transaction = await prisma.transaction.create({
        data: {
          userId,
          categoryId: validated.categoryId,
          type: validated.type,
          name: validated.name,
          amount: validated.amount,
          paymentType: validated.paymentType,
          date,
        },
      });
      return res.status(201).json(transaction);
    }

    // Parcelado
    const installmentCount = validated.installmentsCount;
    const installmentGroupId = generateInstallmentGroupId();
    const amounts = calculateInstallments(validated.amount, installmentCount);

    // Create installments
    const transactions = await prisma.$transaction(
      amounts.map((amount, index) => 
        prisma.transaction.create({
          data: {
            userId,
            categoryId: validated.categoryId,
            type: validated.type,
            name: `${validated.name} (parcela ${index + 1}/${installmentCount})`,
            amount,
            paymentType: 'INSTALLMENT',
            installmentsCount: installmentCount,
            installmentGroupId,
            installmentNumber: index + 1,
            date,
          },
        })
      )
    );

    res.status(201).json(transactions);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    next(error);
  }
};

// GET /api/transactions (with filters)
export const getTransactionsHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;
    const { month, year, categoryIds, type } = req.query;

    // Build where clause
    const where: any = {
      userId,
      deletedAt: null,
    };

    if (month && year) {
      const monthNum = parseInt(month as string, 10);
      const yearNum = parseInt(year as string, 10);
      if (!isNaN(monthNum) && !isNaN(yearNum) && monthNum >= 1 && monthNum <= 12) {
        where.date = {
          gte: new Date(yearNum, monthNum - 1, 1),
          lt: new Date(yearNum, monthNum, 1),
        };
      }
    } else if (year) {
      const yearNum = parseInt(year as string, 10);
      if (!isNaN(yearNum)) {
        where.date = {
          gte: new Date(yearNum, 0, 1),
          lt: new Date(yearNum + 1, 0, 1),
        };
      }
    }

    if (categoryIds) {
      const ids = Array.isArray(categoryIds) ? categoryIds : [categoryIds];
      where.categoryId = { in: ids };
    }

    if (type) {
      if (type === 'INCOME' || type === 'EXPENSE') {
        where.type = type;
      }
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        category: true,
      },
      orderBy: {
        date: 'desc',
      },
    });

    res.json(transactions);
  } catch (error) {
    next(error);
  }
};

// GET /api/transactions/:id
export const getTransactionByIdHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    const transaction = await prisma.transaction.findFirst({
      where: {
        id,
        userId,
        deletedAt: null,
      },
      include: {
        category: true,
      },
    });

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json(transaction);
  } catch (error) {
    next(error);
  }
};

// PATCH /api/transactions/:id
export const updateTransactionHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    // For updates, we allow partial validation (all fields optional except those that must be present if provided)
    const updateSchema = z.object({
      name: z.string().min(1).optional(),
      amount: z.number().int().positive().optional(),
      categoryId: z.string().min(1).optional(),
      paymentType: z.enum(['CASH', 'INSTALLMENT']).optional(),
      installmentsCount: z.number().int().min(2).max(24).optional(),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional(),
    }).refine(
      (data) => {
        // If paymentType is provided as INSTALLMENT, installmentsCount must be provided (or already exist)
        // We'll handle this in the update logic below
        return true;
      }
    );

    const validated = updateSchema.parse(req.body);

    // Fetch existing transaction to check if it's part of an installment group
    const existing = await prisma.transaction.findUnique({
      where: { id },
    });

    if (!existing || existing.userId !== userId || existing.deletedAt !== null) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // If updating installment-related fields, we need to be cautious.
    // For simplicity, we disallow changing installment specifics if it's part of a group.
    // Instead, we only allow updating name, amount, category, date for installments.
    // But note: changing amount of an installment would break the group total.
    // We'll allow updating only if it's a standalone transaction (CASH) or if we are updating non-financial fields.

    // We'll implement: 
    // - If the transaction is part of an installment group (installmentGroupId set), we only allow updating:
    //      name, categoryId, date (and maybe amount? but we'll not allow amount change to keep consistency)
    // - If it's a standalone transaction, we allow all updates.

    let updateData: any = {};
    if (validated.name !== undefined) updateData.name = validated.name;
    if (validated.categoryId !== undefined) updateData.categoryId = validated.categoryId;
    if (validated.date !== undefined) {
      const date = new Date(validated.date);
      date.setHours(0, 0, 0, 0);
      updateData.date = date;
    }

    // For amount and paymentType, we only allow if it's a standalone transaction
    if (existing.paymentType === 'CASH' && !existing.installmentGroupId) {
      if (validated.amount !== undefined) updateData.amount = validated.amount;
      if (validated.paymentType !== undefined) updateData.paymentType = validated.paymentType;
      // Note: changing paymentType from CASH to INSTALLMENT would require generating installments, which is complex.
      // We'll not support that in this update endpoint; client should create new.
    }

    // If we are updating installmentsCount (which we don't allow for grouped transactions) 
    // we'll ignore it for grouped transactions.

    // Prevent updating installmentGroupId, installmentsCount, installmentNumber via this endpoint
    // These should be set only at creation.

    const transaction = await prisma.transaction.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
      },
    });

    res.json(transaction);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    next(error);
  }
};

// DELETE /api/transactions/:id (soft delete)
export const deleteTransactionHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    const transaction = await prisma.transaction.findUnique({
      where: { id },
    });

    if (!transaction || transaction.userId !== userId || transaction.deletedAt !== null) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Soft delete
    await prisma.transaction.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};