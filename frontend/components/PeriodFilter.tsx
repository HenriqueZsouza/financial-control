'use client';

import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { clampPeriod, currentPeriod, months, yearOptions } from '../lib/dates';

export function PeriodFilter({
  month,
  year,
  onChange,
  disableFuture = false,
}: {
  month: number;
  year: number;
  onChange: (value: { month: number; year: number }) => void;
  disableFuture?: boolean;
}) {
  const now = currentPeriod();
  const selected = disableFuture ? clampPeriod(month, year) : { month, year };
  const years = yearOptions(disableFuture);
  const lastMonth = disableFuture && selected.year >= now.year ? now.month : 12;

  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <TextField
        select
        label="Mês"
        value={selected.month}
        onChange={(event) => {
          const nextMonth = Number(event.target.value);
          onChange(disableFuture ? clampPeriod(nextMonth, selected.year) : { month: nextMonth, year: selected.year });
        }}
        sx={{ minWidth: 160 }}
      >
        {months.slice(0, lastMonth).map((name, index) => (
          <MenuItem key={name} value={index + 1}>
            {name}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        select
        label="Ano"
        value={selected.year}
        onChange={(event) => {
          const nextYear = Number(event.target.value);
          onChange(disableFuture ? clampPeriod(selected.month, nextYear) : { month: selected.month, year: nextYear });
        }}
        sx={{ minWidth: 110 }}
      >
        {years.map((value) => (
          <MenuItem key={value} value={value}>
            {value}
          </MenuItem>
        ))}
      </TextField>
    </Stack>
  );
}
