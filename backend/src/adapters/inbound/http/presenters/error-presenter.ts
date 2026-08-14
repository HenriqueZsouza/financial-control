import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { DomainError } from '../../../../domain/shared/errors.js';

const statuses: Record<DomainError['code'], number> = { EMAIL_ALREADY_EXISTS: 409, INVALID_CREDENTIALS: 401, NOT_FOUND: 404, NO_CHANGES: 400, INVALID_CATEGORY: 400, INVALID_TYPE: 400, INVALID_PERIOD: 400, INSTALLMENT_RESTRICTION: 422, PAYMENT_TYPE_RESTRICTION: 422 };
export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof ZodError) return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'Dados inválidos.', details: error.flatten() });
  if (error instanceof DomainError) return res.status(statuses[error.code]).json({ code: error.code, message: error.message, ...(error.details === undefined ? {} : { details: error.details }) });
  console.error(error);
  return res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Ocorreu um erro inesperado.' });
}
