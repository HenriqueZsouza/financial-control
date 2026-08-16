import dayjs, { type Dayjs } from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import utc from 'dayjs/plugin/utc';
import 'dayjs/locale/pt-br';

dayjs.extend(customParseFormat);
dayjs.extend(utc);
dayjs.locale('pt-br');

export { dayjs };

export const DATE_FORMAT = 'DD/MM/YYYY';
export const DATETIME_FORMAT = 'DD/MM/YYYY HH:mm:ss';
export const API_DATE_FORMAT = 'YYYY-MM-DD';

const isCalendarDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) || /T00:00:00(\.0+)?(Z|[+-]|$)/.test(value);

export function parseApiDate(value?: string | null) {
  if (!value) return dayjs();
  const parsed = dayjs(value.slice(0, 10), API_DATE_FORMAT, true);
  return parsed.isValid() ? parsed : dayjs();
}

/** Calendário `YYYY-MM-DD` para filtros e campos de data. */
export function toApiDate(value: Dayjs) {
  return value.format(API_DATE_FORMAT);
}

/**
 * Data de competência + horário da operação (local → ISO).
 * Em edição, preserva o horário já salvo quando existir.
 */
export function toApiDateTime(calendar: Dayjs, existing?: string | null) {
  const now = dayjs();
  const previous = existing ? dayjs(existing) : null;
  const keepTime = Boolean(existing && previous?.isValid() && !isCalendarDate(existing));

  return calendar
    .hour(keepTime ? previous!.hour() : now.hour())
    .minute(keepTime ? previous!.minute() : now.minute())
    .second(keepTime ? previous!.second() : now.second())
    .millisecond(keepTime ? previous!.millisecond() : now.millisecond())
    .toISOString();
}

/** Exibição canônica de datas no produto: DD/MM/YYYY HH:mm:ss. */
export function formatDateTime(value?: string | Date | null) {
  if (!value) return '—';

  const raw = typeof value === 'string' ? value : value.toISOString();
  const parsed = isCalendarDate(raw) ? dayjs(raw.slice(0, 10), API_DATE_FORMAT, true) : dayjs(raw);

  return parsed.isValid() ? parsed.format(DATETIME_FORMAT) : '—';
}

export function currentPeriod() {
  const now = dayjs();
  return { month: now.month() + 1, year: now.year() };
}

export const months = Array.from({ length: 12 }, (_, index) => {
  const name = dayjs().month(index).format('MMMM');
  return name.charAt(0).toUpperCase() + name.slice(1);
});
