import { z } from 'zod';

const isoDate = z.string().refine((value) => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  }
  return !Number.isNaN(Date.parse(value));
}, 'Use a data no formato AAAA-MM-DD ou ISO 8601.');

export const payPayableSchema = z.object({
  paidAt: isoDate,
});
