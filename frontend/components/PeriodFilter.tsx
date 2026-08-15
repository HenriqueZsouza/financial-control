'use client';

import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { currentPeriod, months } from '../lib/dates';

const YEAR_OPTIONS = Array.from({ length: 5 }, (_, index) => currentPeriod().year - 2 + index);

export function PeriodFilter({
  month,
  year,
  onChange,
}: {
  month: number;
  year: number;
  onChange: (value: { month: number; year: number }) => void;
}) {
  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <TextField
        select
        label="Mês"
        value={month}
        onChange={(event) => onChange({ month: Number(event.target.value), year })}
        sx={{ minWidth: 160 }}
      >
        {months.map((name, index) => (
          <MenuItem key={name} value={index + 1}>
            {name}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        select
        label="Ano"
        value={year}
        onChange={(event) => onChange({ month, year: Number(event.target.value) })}
        sx={{ minWidth: 110 }}
      >
        {YEAR_OPTIONS.map((value) => (
          <MenuItem key={value} value={value}>
            {value}
          </MenuItem>
        ))}
      </TextField>
    </Stack>
  );
}
