import { DomainError } from './errors.js';

export interface Period { month: number; year: number; start: Date; end: Date }

export function periodOf(month: number, year: number): Period {
  if (!Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(year) || year < 2000 || year > 9999) {
    throw new DomainError('INVALID_PERIOD', 'Mês e ano devem formar um período válido.');
  }
  return { month, year, start: new Date(Date.UTC(year, month - 1, 1)), end: new Date(Date.UTC(year, month, 1)) };
}

export function dateFromIso(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  const result = new Date(Date.UTC(year, month - 1, day));
  if (result.getUTCFullYear() !== year || result.getUTCMonth() !== month - 1 || result.getUTCDate() !== day) {
    throw new DomainError('INVALID_PERIOD', 'Data inválida.');
  }
  return result;
}

export function todayUtc(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}
