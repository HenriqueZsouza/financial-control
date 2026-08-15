'use client';

import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import NextLink from 'next/link';
import { useState } from 'react';
import { Amount } from '../../../components/Amount';
import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { Empty } from '../../../components/Empty';
import { PageHeader } from '../../../components/PageHeader';
import { PeriodFilter } from '../../../components/PeriodFilter';
import { ApiError, services } from '../../../lib/api';
import { useAuth } from '../../../lib/auth';
import { currentPeriod, formatDateTime } from '../../../lib/dates';
import { useFeedback } from '../../../lib/feedback';
import { queryKeys } from '../../../lib/query-keys';

export default function TransactionsPage() {
  const [period, setPeriod] = useState(currentPeriod);
  const [type, setType] = useState('');
  const [pendingId, setPendingId] = useState<number | null>(null);
  const { valuesVisible } = useAuth();
  const { notify } = useFeedback();
  const client = useQueryClient();
  const query = new URLSearchParams({
    month: String(period.month),
    year: String(period.year),
    ...(type ? { type } : {}),
  });
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.transactions(query.toString()),
    queryFn: () => services.transactions(query),
  });

  const remove = useMutation({
    mutationFn: (id: number) => services.deleteTransaction(id),
    onSuccess: async () => {
      setPendingId(null);
      await Promise.all([
        client.invalidateQueries({ queryKey: ['transactions'] }),
        client.invalidateQueries({ queryKey: ['summary'] }),
      ]);
      notify('Lançamento excluído.');
    },
    onError: (reason) => {
      notify(reason instanceof ApiError ? reason.message : 'Não foi possível excluir o lançamento.', 'error');
    },
  });

  return (
    <>
      <PageHeader
        eyebrow="Movimentações"
        title="Lançamentos"
        description="Confira e ajuste as movimentações do seu período."
        action={
          <Button component={NextLink} href="/lancamentos/novo" variant="contained">
            Novo lançamento
          </Button>
        }
      />
      <Paper sx={{ p: 2.25, mb: 2.25, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'flex-end' }}>
          <PeriodFilter {...period} onChange={setPeriod} />
          <TextField select label="Tipo" value={type} onChange={(event) => setType(event.target.value)} sx={{ minWidth: 180 }}>
            <MenuItem value="">Todos</MenuItem>
            <MenuItem value="INCOME">Entradas</MenuItem>
            <MenuItem value="EXPENSE">Despesas</MenuItem>
          </TextField>
        </Stack>
      </Paper>
      <Paper sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'auto' }}>
        {isLoading ? (
          <Stack alignItems="center" sx={{ py: 8, gap: 2 }}>
            <CircularProgress size={28} />
            <Typography variant="caption">Carregando lançamentos…</Typography>
          </Stack>
        ) : !data?.transactions.length ? (
          <Empty />
        ) : (
          <Table sx={{ minWidth: 660 }}>
            <TableHead>
              <TableRow>
                <TableCell>Data</TableCell>
                <TableCell>Descrição</TableCell>
                <TableCell>Categoria</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell align="right">Valor</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {data.transactions.map((transaction) => (
                <TableRow key={transaction.id} hover>
                  <TableCell>{formatDateTime(transaction.date)}</TableCell>
                  <TableCell>
                    {transaction.name}
                    {transaction.installmentsCount ? (
                      <Typography variant="caption" display="block" color="text.secondary">
                        Parcela {transaction.installmentNumber}/{transaction.installmentsCount}
                      </Typography>
                    ) : null}
                  </TableCell>
                  <TableCell>{transaction.category.name}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      color={transaction.type === 'INCOME' ? 'success' : 'error'}
                      label={transaction.type === 'INCOME' ? 'Entrada' : 'Despesa'}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Amount
                      cents={transaction.amount}
                      visible={valuesVisible}
                      tone={transaction.type === 'INCOME' ? 'income' : 'expense'}
                      sign={transaction.type === 'INCOME' ? '+' : '−'}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Editar">
                      <IconButton component={NextLink} href={`/lancamentos/${transaction.id}`} aria-label="Editar lançamento">
                        <EditOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Excluir">
                      <IconButton aria-label="Excluir lançamento" onClick={() => setPendingId(transaction.id)}>
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>
      <ConfirmDialog
        open={pendingId !== null}
        title="Excluir lançamento"
        description="O lançamento deixa de aparecer nas listagens. Esta ação não pode ser desfeita pela interface."
        loading={remove.isPending}
        onClose={() => setPendingId(null)}
        onConfirm={() => {
          if (pendingId !== null) remove.mutate(pendingId);
        }}
      />
    </>
  );
}
