'use client';

import Alert from '@mui/material/Alert';
import Autocomplete from '@mui/material/Autocomplete';
import CircularProgress from '@mui/material/CircularProgress';
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
import type { Category, Transaction } from '../../../lib/types';

export default function CreditCardPage() {
  const [period, setPeriod] = useState(currentPeriod);
  const [category, setCategory] = useState<Category | null>(null);
  const { valuesVisible } = useAuth();
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.creditCard(period.month, period.year),
    queryFn: () => services.creditCardReport(period.month, period.year),
  });
  const categories = useMemo(() => {
    if (!data) {
      return [];
    }

    return Array.from(
      new Map(
        [...data.credit1x, ...data.installments].map((item) => [item.category.id, item.category]),
      ).values(),
    );
  }, [data]);
  const filteredCredit1x = useMemo(
    () => data?.credit1x.filter((item) => !category || item.categoryId === category.id) ?? [],
    [category, data],
  );
  const filteredInstallments = useMemo(
    () => data?.installments.filter((item) => !category || item.categoryId === category.id) ?? [],
    [category, data],
  );
  const totalCredit1x = useMemo(
    () => filteredCredit1x.reduce((total, item) => total + item.amount, 0),
    [filteredCredit1x],
  );
  const totalInstallment = useMemo(
    () => filteredInstallments.reduce((total, item) => total + item.amount, 0),
    [filteredInstallments],
  );
  const total = totalCredit1x + totalInstallment;

  return (
    <>
      <PageHeader
        eyebrow="Fatura"
        title="Cartão de crédito"
        description="Compras à vista em 1x e parcelas que caem neste mês."
        action={
          <PeriodFilter
            {...period}
            onChange={(value) => {
              setPeriod(value);
              setCategory(null);
            }}
          />
        }
      />
      {isLoading ? (
        <Stack alignItems="center" sx={{ py: 8, gap: 2 }}>
          <CircularProgress size={28} />
          <Typography variant="caption">Carregando fatura…</Typography>
        </Stack>
      ) : error || !data ? (
        <Alert severity="error">Não foi possível carregar o relatório do cartão.</Alert>
      ) : (
        <>
          <Paper
            sx={{
              p: 2.25,
              mb: 2.25,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2,
            }}
          >
            <Autocomplete
              options={categories}
              getOptionLabel={(option) => option.name}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              value={category}
              onChange={(_, value) => setCategory(value)}
              sx={{ maxWidth: 360 }}
              renderInput={(params) => <TextField {...params} label="Categoria" />}
            />
          </Paper>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={2}
            sx={{ mb: 2.25 }}
          >
            <TotalCard label="À vista (1x)" cents={totalCredit1x} visible={valuesVisible} />
            <TotalCard label="Parceladas" cents={totalInstallment} visible={valuesVisible} />
            <TotalCard label="Total do mês" cents={total} visible={valuesVisible} />
          </Stack>
          {!filteredCredit1x.length && !filteredInstallments.length ? (
            <Paper sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <Empty>
                {category
                  ? 'Nenhuma compra nesta categoria no período selecionado.'
                  : 'Lance uma compra com pagamento crédito à vista (1x) ou parcelado.'}
              </Empty>
            </Paper>
          ) : (
            <Stack spacing={2.25}>
              <PurchaseTable
                title="Compras à vista (1x)"
                rows={filteredCredit1x}
                visible={valuesVisible}
                empty="Nenhuma compra à vista (1x) neste mês."
                showInstallment={false}
              />
              <PurchaseTable
                title="Parcelas do mês"
                rows={filteredInstallments}
                visible={valuesVisible}
                empty="Nenhuma parcela neste mês."
                showInstallment
              />
            </Stack>
          )}
        </>
      )}
    </>
  );
}

function TotalCard({
  label,
  cents,
  visible,
}: {
  label: string;
  cents: number;
  visible: boolean;
}) {
  return (
    <Paper
      sx={{
        flex: 1,
        minHeight: 120,
        p: 2.75,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Typography variant="overline">{label}</Typography>
      <Amount
        cents={cents}
        visible={visible}
        tone="expense"
        sx={{ mt: 'auto', pt: 2, fontSize: 28 }}
      />
    </Paper>
  );
}

function PurchaseTable({
  title,
  rows,
  visible,
  empty,
  showInstallment,
}: {
  title: string;
  rows: Transaction[];
  visible: boolean;
  empty: string;
  showInstallment: boolean;
}) {
  return (
    <Paper sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'auto' }}>
      <Typography variant="h3" sx={{ px: 2.25, pt: 2.25, pb: 1 }}>
        {title}
      </Typography>
      {!rows.length ? (
        <Empty>{empty}</Empty>
      ) : (
        <Table sx={{ minWidth: 660 }}>
          <TableHead>
            <TableRow>
              <TableCell>Data</TableCell>
              <TableCell>Lançamento</TableCell>
              <TableCell>Categoria</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell align="right">Valor</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((item) => (
              <TableRow key={item.id} hover>
                <TableCell>{formatDateTime(item.date)}</TableCell>
                <TableCell>
                  {item.name}
                  {showInstallment && item.installmentsCount ? (
                    <Typography variant="caption" display="block" color="text.secondary">
                      Parcela {item.installmentNumber}/{item.installmentsCount}
                    </Typography>
                  ) : null}
                </TableCell>
                <TableCell>{item.category.name}</TableCell>
                <TableCell>
                  <TransactionTypeChip type={item.type} />
                </TableCell>
                <TableCell align="right">
                  <Amount cents={item.amount} visible={visible} tone="expense" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Paper>
  );
}
