import type { NextFunction, Request, Response } from 'express';
import type {
  CloseCreditCardInvoice,
  GetCreditCardReport,
  GetOpenCreditCardInvoice,
} from '../../../../application/ports/inbound/credit-card.js';
import { dateFromIso, periodOf } from '../../../../domain/shared/period.js';
import { closeInvoiceSchema } from '../dto/credit-card-dto.js';
import { dashboardSchema } from '../dto/transaction-dto.js';
import { presentPayable } from '../presenters/payable-presenter.js';
import { presentTransaction } from '../presenters/transaction-presenter.js';

export class CreditCardController {
  constructor(
    private readonly getReport: GetCreditCardReport,
    private readonly getOpenInvoice: GetOpenCreditCardInvoice,
    private readonly closeInvoice: CloseCreditCardInvoice,
  ) {}

  report = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = dashboardSchema.parse(req.query);
      const report = await this.getReport.execute(
        req.userId!,
        query.month ? periodOf(query.month, query.year!) : undefined,
      );
      res.json({ ...report, credit1x: report.credit1x.map(presentTransaction), installments: report.installments.map(presentTransaction) });
    } catch (error) {
      next(error);
    }
  };

  openInvoice = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await this.getOpenInvoice.execute(req.userId!));
    } catch (error) {
      next(error);
    }
  };

  close = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = closeInvoiceSchema.parse(req.body);
      const payable = await this.closeInvoice.execute(req.userId!, {
        dueDate: dateFromIso(input.dueDate),
      });
      res.status(201).json(presentPayable(payable));
    } catch (error) {
      next(error);
    }
  };
}
