import type { NextFunction, Request, Response } from 'express';
import type { CreateTransaction, DeleteTransaction, GetTransaction, ListTransactions, UpdateTransaction } from '../../../../application/ports/inbound/transactions.js';
import { periodOf, dateFromIso } from '../../../../domain/shared/period.js';
import { createTransactionSchema, idParamSchema, listTransactionsSchema, updateTransactionSchema } from '../dto/transaction-dto.js';

const categoryIds = (value: string | string[] | undefined) => (Array.isArray(value) ? value.flatMap((entry) => entry.split(',')) : value?.split(',') ?? []).map((id) => id.trim()).filter(Boolean).map((id) => idParamSchema.parse(id));
export class TransactionsController {
  constructor(private readonly createTransaction: CreateTransaction, private readonly listTransactions: ListTransactions, private readonly getTransaction: GetTransaction, private readonly updateTransaction: UpdateTransaction, private readonly deleteTransaction: DeleteTransaction) {}
  create = async (req: Request, res: Response, next: NextFunction) => { try {
    const input = createTransactionSchema.parse(req.body); const { date, ...data } = input;
    res.status(201).json({ transactions: await this.createTransaction.execute(req.userId!, { ...data, ...(date ? { date: dateFromIso(date) } : {}) }) });
  } catch (error) { next(error); } };
  list = async (req: Request, res: Response, next: NextFunction) => { try {
    const query = listTransactionsSchema.parse(req.query);
    const transactions = await this.listTransactions.execute(req.userId!, { ...(query.month ? { period: periodOf(query.month, query.year!) } : {}), categoryIds: categoryIds(query.categoryIds), ...(query.type ? { type: query.type } : {}), ...(query.scope ? { scope: query.scope } : {}) });
    res.json({ transactions: query.scope === 'family' ? transactions.map(({ user, ...transaction }: any) => ({ ...transaction, member: user })) : transactions });
  } catch (error) { next(error); } };
  getById = async (req: Request, res: Response, next: NextFunction) => { try { res.json({ transaction: await this.getTransaction.execute(req.userId!, idParamSchema.parse(req.params.id)) }); } catch (error) { next(error); } };
  update = async (req: Request, res: Response, next: NextFunction) => { try {
    const input = updateTransactionSchema.parse(req.body); const { date, ...data } = input;
    res.json({ transaction: await this.updateTransaction.execute(req.userId!, idParamSchema.parse(req.params.id), { ...data, ...(date ? { date: dateFromIso(date) } : {}) }) });
  } catch (error) { next(error); } };
  remove = async (req: Request, res: Response, next: NextFunction) => { try { await this.deleteTransaction.execute(req.userId!, idParamSchema.parse(req.params.id)); res.status(204).send(); } catch (error) { next(error); } };
}
