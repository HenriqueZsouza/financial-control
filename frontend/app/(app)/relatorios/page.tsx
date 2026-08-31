'use client';

import Autocomplete from '@mui/material/Autocomplete';
import CircularProgress from '@mui/material/CircularProgress';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Amount } from '../../../components/Amount';
import { Empty } from '../../../components/Empty';
import { PageHeader } from '../../../components/PageHeader';
import { PeriodFilter } from '../../../components/PeriodFilter';
import { TransactionTypeChip } from '../../../components/TransactionTypeChip';
import { services } from '../../../lib/api';
import { useAuth } from '../../../lib/auth';
import { currentPeriod, formatDateTime } from '../../../lib/dates';
import { queryKeys } from '../../../lib/query-keys';
import { transactionAmountTone } from '../../../lib/transaction-ui';
import type { Category } from '../../../lib/types';

export default function ReportsPage() {
  const [period, setPeriod] = useState(currentPeriod);
  const [type, setType] = useState('');
  const [scope, setScope] = useState<'personal' | 'family'>('personal');
  const [categories, setCategories] = useState<Category[]>([]);
  const { valuesVisible } = useAuth();
  const { data: allCategories } = useQuery({ queryKey: queryKeys.categories, queryFn: services.categories });
  const params = new URLSearchParams({
    month: String(period.month),
    year: String(period.year),
    ...(type ? { type } : {}),
    ...(categories.length ? { categoryIds: categories.map((item) => item.id).join(',') } : {}),
    scope,
  });
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.report(params.toString()),
    queryFn: () => services.transactions(params),
  });

  const { totalIncome, totalExpense, totalInvestment } = useMemo(() => {
    const items = data?.transactions ?? [];
    return {
      totalIncome: items.filter((item) => item.type === 'INCOME').reduce((sum, item) => sum + item.amount, 0),
      totalExpense: items
        .filter((item) => item.type === 'EXPENSE' && item.paymentType === 'CASH')
        .reduce((sum, item) => sum + item.amount, 0),
      totalInvestment: items.filter((item) => item.type === 'INVESTMENT').reduce((sum, item) => sum + item.amount, 0),
    };
  }, [data]);

  return (
    <>
      <PageHeader eyebrow="Análise" title="Relatório geral" description="Analise os lançamentos por período, categoria e tipo. Meses futuros não entram no filtro." />
      <Paper sx={{ p: 2.25, mb: 2.25, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'flex-end' }}>
          <PeriodFilter {...period} onChange={setPeriod} disableFuture />
          <Autocomplete
            multiple
            options={allCategories ?? []}
            getOptionLabel={(option) => option.name}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            value={categories}
            onChange={(_, value) => setCategories(value)}
            sx={{ minWidth: 260, flex: 1 }}
            renderInput={(params) => <TextField {...params} label="Categorias" />}
          />
          <TextField select label="Tipo" value={type} onChange={(event) => setType(event.target.value)} sx={{ minWidth: 180 }}>
            <MenuItem value="">Todos</MenuItem>
            <MenuItem value="INCOME">Entradas</MenuItem>
            <MenuItem value="EXPENSE">Despesas</MenuItem>
            <MenuItem value="INVESTMENT">Investimentos</MenuItem>
          </TextField>
          <TextField select label="Escopo" value={scope} onChange={(event) => setScope(event.target.value as 'personal' | 'family')} sx={{ minWidth: 180 }}>
            <MenuItem value="personal">Individual</MenuItem>
            <MenuItem value="family">Grupo familiar</MenuItem>
          </TextField>
        </Stack>
      </Paper>
      <BoxCards totalIncome={totalIncome} totalExpense={totalExpense} totalInvestment={totalInvestment} visible={valuesVisible} />
      <Paper sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'auto' }}>
        {isLoading ? (
          <Stack alignItems="center" sx={{ py: 8, gap: 2 }}>
            <CircularProgress size={28} />
            <Typography variant="caption">Gerando relatório…</Typography>
          </Stack>
        ) : !data?.transactions.length ? (
          <Empty />
        ) : (
          <Table sx={{ minWidth: 660 }}>
            <TableHead>
              <TableRow>
                <TableCell>Data</TableCell>
                <TableCell>Lançamento</TableCell>
                <TableCell>Categoria</TableCell>
                <TableCell>Tipo</TableCell>
                {scope === 'family' ? <TableCell>Membro</TableCell> : null}
                <TableCell align="right">Valor</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.transactions.map((item) => (
                <TableRow key={item.id} hover>
                  <TableCell>{formatDateTime(item.date)}</TableCell>
                  <TableCell>
                    {item.name}
                    {item.paymentType === 'CREDIT_1X' ? (
                      <Typography variant="caption" display="block" color="text.secondary">
                        Crédito à vista (1x)
                      </Typography>
                    ) : item.installmentsCount ? (
                      <Typography variant="caption" display="block" color="text.secondary">
                        Parcela {item.installmentNumber}/{item.installmentsCount}
                      </Typography>
                    ) : null}
                  </TableCell>
                  <TableCell>{item.category.name}</TableCell>
                  <TableCell>
                    <TransactionTypeChip type={item.type} />
                  </TableCell>
                  {scope === 'family' ? <TableCell>{item.member ? `${item.member.firstName} ${item.member.lastName}` : '—'}</TableCell> : null}
                  <TableCell align="right">
                    <Amount cents={item.amount} visible={valuesVisible} tone={transactionAmountTone(item.type, item.paymentType)} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>
    </>
  );
}

function BoxCards({
  totalIncome,
  totalExpense,
  totalInvestment,
  visible,
}: {
  totalIncome: number;
  totalExpense: number;
  totalInvestment: number;
  visible: boolean;
}) {
  const result = totalIncome - totalExpense;
  const cards = [
    { label: 'Entradas filtradas', cents: totalIncome, tone: 'income' as const },
    { label: 'Despesas filtradas', cents: totalExpense, tone: 'expense' as const },
    { label: 'Investimentos filtrados', cents: totalInvestment, tone: 'plain' as const },
    { label: 'Resultado filtrado', cents: result, tone: 'auto' as const },
  ];

  return (
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      spacing={2}
      sx={{ mb: 2.25, flexWrap: { md: 'wrap' } }}
    >
      {cards.map((card) => (
        <Paper key={card.label} sx={{ flex: 1, minHeight: 120, p: 2.75, border: '1px solid', borderColor: 'divider', borderRadius: 2, display: 'flex', flexDirection: 'column' }}>
          <Typography variant="overline">{card.label}</Typography>
          <Amount cents={card.cents} visible={visible} tone={card.tone} sx={{ mt: 'auto', pt: 2, fontSize: 28 }} />
        </Paper>
      ))}
    </Stack>
  );
}
