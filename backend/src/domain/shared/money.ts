import { DomainError } from './errors.js';

export type Money = number;

export function money(value: number): Money {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new DomainError('INVALID_TYPE', 'O valor deve ser informado em centavos.');
  }
  return value;
}
