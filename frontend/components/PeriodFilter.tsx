'use client';
import { months } from '../lib/format';
export function PeriodFilter({ month, year, onChange }: { month: number; year: number; onChange: (value: { month: number; year: number }) => void }) {
  const years = Array.from({ length: 5 }, (_, index) => new Date().getFullYear() - 2 + index);
  return <div className="period"><select aria-label="Mês" value={month} onChange={(event) => onChange({ month: Number(event.target.value), year })}>{months.map((name, index) => <option value={index + 1} key={name}>{name}</option>)}</select><select aria-label="Ano" value={year} onChange={(event) => onChange({ month, year: Number(event.target.value) })}>{years.map((value) => <option key={value}>{value}</option>)}</select></div>;
}
