import type { NextFunction, Request, Response } from 'express';
import type { GetDashboardSummary } from '../../../../application/ports/inbound/dashboard.js';
import { periodOf } from '../../../../domain/shared/period.js';
import { dashboardSchema } from '../dto/transaction-dto.js';
export class DashboardController {
  constructor(private readonly getSummary: GetDashboardSummary) {}
  summary = async (req: Request, res: Response, next: NextFunction) => { try {
    const query = dashboardSchema.parse(req.query);
    res.json(await this.getSummary.execute(req.userId!, query.month ? periodOf(query.month, query.year!) : undefined));
  } catch (error) { next(error); } };
}
