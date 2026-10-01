import type { NextFunction, Request, Response } from 'express';
import type { ListPayables, PayPayable } from '../../../../application/ports/inbound/payables.js';
import { dateFromIso, periodOf } from '../../../../domain/shared/period.js';
import { payPayableSchema } from '../dto/payable-dto.js';
import { dashboardSchema, idParamSchema } from '../dto/transaction-dto.js';
import { presentPayable } from '../presenters/payable-presenter.js';

export class PayableController {
  constructor(
    private readonly listPayables: ListPayables,
    private readonly payPayable: PayPayable,
  ) {}

  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = dashboardSchema.parse(req.query);
      const result = await this.listPayables.execute(
        req.userId!,
        query.month ? periodOf(query.month, query.year!) : undefined,
      );
      res.json({
        period: result.period,
        totalAmount: result.totalAmount,
        count: result.count,
        items: result.items.map(presentPayable),
      });
    } catch (error) {
      next(error);
    }
  };

  pay = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = payPayableSchema.parse(req.body);
      const payable = await this.payPayable.execute(
        req.userId!,
        idParamSchema.parse(req.params.id),
        { paidAt: dateFromIso(input.paidAt) },
      );
      res.json(presentPayable(payable));
    } catch (error) {
      next(error);
    }
  };
}
