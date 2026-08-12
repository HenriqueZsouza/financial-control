import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

export class AppError extends Error {
  constructor(public status: number, public code: string, message: string, public details?: unknown) {
    super(message);
  }
}

export const notFound = (resource: string) => new AppError(404, 'NOT_FOUND', `${resource} não encontrado.`);

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof ZodError) {
    return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'Dados inválidos.', details: error.flatten() });
  }
  if (error instanceof AppError) {
    return res.status(error.status).json({ code: error.code, message: error.message, ...(error.details ? { details: error.details } : {}) });
  }
  console.error(error);
  return res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Ocorreu um erro inesperado.' });
}
