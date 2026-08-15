export { currentPeriod, formatDateTime, months } from './dates';

export const money = (cents: number, visible = true) =>
  visible ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100) : '••••••';
