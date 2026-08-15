export { currentPeriod, formatDateTime, months } from './dates';

export const money = (cents: number, visible = true) =>
  visible ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100) : '••••••';

const currencyInputFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Formata dígitos digitados como valor monetário pt-BR (ex.: 1234 → 12,34). */
export const formatCurrencyInput = (raw: string) => {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  return currencyInputFormatter.format(Number(digits) / 100);
};

export const centsToCurrencyInput = (cents: number) => currencyInputFormatter.format(cents / 100);

export const currencyInputToCents = (value: string) => Number(value.replace(/\D/g, ''));
