import type { NextFunction, Request, Response } from 'express';
import type { ListPayables } from '../../../../application/ports/inbound/payables.js';
import { periodOf } from '../../../../domain/shared/period.js';
import { dashboardSchema } from '../dto/transaction-dto.js';
import { presentPayable } from '../presenters/payable-presenter.js';

export class PayableController {
  constructor(private readonly listPayables: ListPayables) {}

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
}
