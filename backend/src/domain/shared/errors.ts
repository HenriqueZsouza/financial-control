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
  | 'PAYMENT_TYPE_RESTRICTION'
  | 'FORBIDDEN'
  | 'USER_NOT_FOUND'
  | 'CANNOT_INVITE_SELF'
  | 'ALREADY_IN_FAMILY_GROUP'
  | 'INVITE_ALREADY_PENDING'
  | 'INVITE_NOT_PENDING'
  | 'OWNER_CANNOT_LEAVE'
  | 'FAMILY_SCOPE_FORBIDDEN';

export const notFound = (resource: string) => new DomainError('NOT_FOUND', `${resource} não encontrado.`);
