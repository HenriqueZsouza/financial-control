export class DomainError extends Error {
  constructor(public readonly code: DomainErrorCode, message: string, public readonly details?: unknown) {
    super(message);
    this.name = 'DomainError';
  }
}

export type DomainErrorCode =
  | 'EMAIL_ALREADY_EXISTS'
  | 'INVALID_CREDENTIALS'
  | 'NOT_FOUND'
  | 'NO_CHANGES'
  | 'INVALID_CATEGORY'
  | 'INVALID_TYPE'
  | 'INVALID_PERIOD'
  | 'INSTALLMENT_RESTRICTION'
  | 'PAYMENT_TYPE_RESTRICTION';

export const notFound = (resource: string) => new DomainError('NOT_FOUND', `${resource} não encontrado.`);
