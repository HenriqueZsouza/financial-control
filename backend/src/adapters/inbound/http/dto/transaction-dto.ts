import { z } from 'zod';
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a data no formato AAAA-MM-DD.').refine((value) => {
  const [year, month, day] = value.split('-').map(Number); const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}, 'Data inválida.');
export const idParamSchema = z.coerce.number().int().positive();
const fields = z.object({
  type: z.enum(['INCOME', 'EXPENSE']), name: z.string().trim().min(1).max(160), amount: z.number().int().positive('O valor deve ser informado em centavos.'), categoryId: z.coerce.number().int().positive(),
  paymentType: z.enum(['CASH', 'CREDIT_1X', 'INSTALLMENT']), installmentsCount: z.number().int().min(2).max(120).optional(), date: isoDate.optional(),
});
export const createTransactionSchema = fields.superRefine((data, context) => {
  if (data.paymentType === 'INSTALLMENT' && !data.installmentsCount) context.addIssue({ code: z.ZodIssueCode.custom, path: ['installmentsCount'], message: 'Informe a quantidade de parcelas.' });
});
export const updateTransactionSchema = fields.partial().omit({ installmentsCount: true });
export const listTransactionsSchema = z.object({
  month: z.coerce.number().int().min(1).max(12).optional(), year: z.coerce.number().int().min(2000).max(9999).optional(), type: z.enum(['INCOME', 'EXPENSE']).optional(), categoryIds: z.union([z.string(), z.array(z.string())]).optional(),
}).refine((data) => (data.month === undefined) === (data.year === undefined), { message: 'Mês e ano devem formar um período válido.', path: ['month'] });
export const dashboardSchema = z.object({ month: z.coerce.number().int().min(1).max(12).optional(), year: z.coerce.number().int().min(2000).max(9999).optional() })
  .refine((data) => (data.month === undefined) === (data.year === undefined), { message: 'Mês e ano devem formar um período válido.', path: ['month'] });
