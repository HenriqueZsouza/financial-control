import type { NextFunction, Request, Response } from 'express';
import { PaymentType, TransactionType } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { AppError, notFound } from '../../shared/http';
import { prisma } from '../../shared/prisma';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a data no formato AAAA-MM-DD.');
const transactionFields = z.object({
  type: z.nativeEnum(TransactionType),
  name: z.string().trim().min(1).max(160),
  amount: z.number().int().positive('O valor deve ser informado em centavos.'),
  categoryId: z.string().min(1),
  paymentType: z.nativeEnum(PaymentType),
  installmentsCount: z.number().int().min(2).max(120).optional(),
  date: isoDate.optional(),
});
const createSchema = transactionFields.superRefine((data, context) => {
  if (data.paymentType === PaymentType.INSTALLMENT && !data.installmentsCount) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['installmentsCount'], message: 'Informe a quantidade de parcelas.' });
  }
});

const updateSchema = transactionFields.partial().omit({ installmentsCount: true });

function parseDate(value?: string) {
  if (!value) {
    const now = new Date();
    return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  }
  const [year, month, day] = value.split('-').map(Number);
  const result = new Date(Date.UTC(year, month - 1, day));
  if (result.getUTCFullYear() !== year || result.getUTCMonth() !== month - 1 || result.getUTCDate() !== day) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Data inválida.');
  }
  return result;
}

function addMonths(date: Date, months: number) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, date.getUTCDate()));
}

function getDateRange(month?: unknown, year?: unknown) {
  if (month === undefined && year === undefined) return undefined;
  const targetMonth = Number(month);
  const targetYear = Number(year);
  if (!Number.isInteger(targetMonth) || targetMonth < 1 || targetMonth > 12 || !Number.isInteger(targetYear) || targetYear < 2000 || targetYear > 9999) {
    throw new AppError(400, 'INVALID_PERIOD', 'Mês e ano devem formar um período válido.');
  }
  return { gte: new Date(Date.UTC(targetYear, targetMonth - 1, 1)), lt: new Date(Date.UTC(targetYear, targetMonth, 1)) };
}

function categoryIdsFromQuery(value: unknown) {
  const raw = Array.isArray(value) ? value.flatMap(String) : typeof value === 'string' ? value.split(',') : [];
  return raw.map((id) => id.trim()).filter(Boolean);
}

async function ensureCategory(categoryId: string) {
  const category = await prisma.category.findUnique({ where: { id: categoryId }, select: { id: true } });
  if (!category) throw new AppError(400, 'INVALID_CATEGORY', 'A categoria informada não existe.');
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createSchema.parse(req.body);
    await ensureCategory(input.categoryId);
    const date = parseDate(input.date);
    const userId = req.userId!;
    if (input.paymentType === PaymentType.CASH) {
      const transaction = await prisma.transaction.create({ data: {
        userId, categoryId: input.categoryId, type: input.type, name: input.name, amount: input.amount,
        paymentType: PaymentType.CASH, installmentsCount: null, date,
      } });
      return res.status(201).json({ transactions: [transaction] });
    }
    const count = input.installmentsCount!;
    const base = Math.floor(input.amount / count);
    const lastAmount = base + (input.amount % count);
    const groupId = randomUUID();
    const transactions = await prisma.$transaction(Array.from({ length: count }, (_, index) => prisma.transaction.create({
      data: {
        userId, categoryId: input.categoryId, type: input.type, name: input.name,
        amount: index === count - 1 ? lastAmount : base,
        paymentType: PaymentType.INSTALLMENT, installmentsCount: count, installmentGroupId: groupId,
        installmentNumber: index + 1, date: addMonths(date, index),
      },
    })));
    return res.status(201).json({ transactions });
  } catch (error) { return next(error); }
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const date = getDateRange(req.query.month, req.query.year);
    const categoryIds = categoryIdsFromQuery(req.query.categoryIds);
    const type = typeof req.query.type === 'string' ? req.query.type : undefined;
    let transactionType: TransactionType | undefined;
    if (req.query.type !== undefined && type !== TransactionType.INCOME && type !== TransactionType.EXPENSE) {
      throw new AppError(400, 'INVALID_TYPE', 'Tipo de lançamento inválido.');
    }
    if (type) transactionType = type as TransactionType;
    const transactions = await prisma.transaction.findMany({
      where: { userId: req.userId!, deletedAt: null, ...(date ? { date } : {}), ...(categoryIds.length ? { categoryId: { in: categoryIds } } : {}), ...(transactionType ? { type: transactionType } : {}) },
      include: { category: true }, orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    });
    return res.json({ transactions });
  } catch (error) { return next(error); }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const transaction = await prisma.transaction.findFirst({ where: { id: req.params.id, userId: req.userId!, deletedAt: null }, include: { category: true } });
    if (!transaction) throw notFound('Lançamento');
    return res.json({ transaction });
  } catch (error) { return next(error); }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const input = updateSchema.parse(req.body);
    const current = await prisma.transaction.findFirst({ where: { id: req.params.id, userId: req.userId!, deletedAt: null } });
    if (!current) throw notFound('Lançamento');
    if (input.categoryId) await ensureCategory(input.categoryId);
    if (current.installmentGroupId && (input.amount !== undefined || input.paymentType !== undefined)) {
      throw new AppError(422, 'INSTALLMENT_RESTRICTION', 'Não é possível alterar valor ou pagamento de uma parcela.');
    }
    if (input.paymentType === PaymentType.INSTALLMENT) {
      throw new AppError(422, 'PAYMENT_TYPE_RESTRICTION', 'Crie um novo lançamento para alterar para parcelado.');
    }
    const { date, ...data } = input;
    const transaction = await prisma.transaction.update({ where: { id: current.id }, data: { ...data, ...(date ? { date: parseDate(date) } : {}) }, include: { category: true } });
    return res.json({ transaction });
  } catch (error) { return next(error); }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const transaction = await prisma.transaction.findFirst({ where: { id: req.params.id, userId: req.userId!, deletedAt: null }, select: { id: true } });
    if (!transaction) throw notFound('Lançamento');
    await prisma.transaction.update({ where: { id: transaction.id }, data: { deletedAt: new Date() } });
    return res.status(204).send();
  } catch (error) { return next(error); }
}
