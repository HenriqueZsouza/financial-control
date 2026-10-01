'use client';

import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Amount } from '../../../components/Amount';
import { Empty } from '../../../components/Empty';
import { PageHeader } from '../../../components/PageHeader';
import { PayPayableDialog } from '../../../components/PayPayableDialog';
import { PeriodFilter } from '../../../components/PeriodFilter';
import { ApiError, services } from '../../../lib/api';
import { useAuth } from '../../../lib/auth';
import { currentPeriod, formatDate, formatDateTime, toApiDateTime } from '../../../lib/dates';
import { useFeedback } from '../../../lib/feedback';
import { queryKeys } from '../../../lib/query-keys';
import type { Payable } from '../../../lib/types';

export default function PayablesPage() {
  const [period, setPeriod] = useState(currentPeriod);
  const [paying, setPaying] = useState<Payable | null>(null);
  const { valuesVisible } = useAuth();
  const { notify } = useFeedback();
  const client = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.payables(period.month, period.year),
    queryFn: () => services.payables(period.month, period.year),
  });
  const pay = useMutation({
    mutationFn: (input: { id: number; paidAt: string }) => {
      return services.payPayable(input.id, input.paidAt);
    },
    onSuccess: async () => {
      notify('Conta paga. O valor saiu do saldo.');
      setPaying(null);
      await Promise.all([
        client.invalidateQueries({ queryKey: ['payables'] }),
        client.invalidateQueries({ queryKey: ['summary'] }),
        client.invalidateQueries({ queryKey: ['transactions'] }),
        client.invalidateQueries({ queryKey: ['report'] }),
      ]);
    },
    onError: (cause) => {
      notify(cause instanceof ApiError ? cause.message : 'Não foi possível pagar a conta.', 'error');
    },
  });

  return (
    <>
      <PageHeader
        eyebrow="Vencimentos"
        title="Contas a pagar"
        description="Contas com vencimento neste mês. Pague cada uma à vista: o valor vira despesa e sai do saldo."
        action={<PeriodFilter {...period} onChange={setPeriod} />}
      />
      {isLoading ? (
        <Stack alignItems="center" sx={{ py: 8, gap: 2 }}>
          <CircularProgress size={28} />
          <Typography variant="caption">Carregando contas a pagar…</Typography>
        </Stack>
      ) : error || !data ? (
        <Alert severity="error">Não foi possível carregar as contas a pagar.</Alert>
      ) : (
        <>
          <Paper
            sx={{
              p: 2.75,
              mb: 2.25,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2,
            }}
          >
            <Typography variant="overline">Total do mês</Typography>
            <Amount
              cents={data.totalAmount}
              visible={valuesVisible}
              tone="expense"
              sx={{ display: 'block', fontSize: 28, mt: 1 }}
            />
            <Typography
              color="text.secondary"
              variant="body2"
              sx={{ mt: 0.75 }}
            >
              {data.count === 1 ? '1 conta' : `${data.count} contas`}
            </Typography>
          </Paper>
          <Paper sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'auto' }}>
            {!data.items.length ? (
              <Empty>
                Nenhuma conta a pagar neste mês. Feche a fatura do cartão na home para lançar a primeira.
              </Empty>
            ) : (
              <Table sx={{ minWidth: 760 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Nome</TableCell>
                    <TableCell>Origem</TableCell>
                    <TableCell>Vencimento</TableCell>
                    <TableCell>Situação</TableCell>
                    <TableCell align="right">Valor</TableCell>
                    <TableCell align="right">Ação</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.items.map((item) => (
                    <TableRow key={item.id} hover>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>
                        <Chip
                          variant="outlined"
                          label="Fatura do cartão"
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{formatDate(item.dueDate)}</TableCell>
                      <TableCell>
                        <Stack
                          spacing={0.5}
                          alignItems="flex-start"
                        >
                          <Chip
                            variant="outlined"
                            size="small"
                            label={item.status === 'PAID' ? 'Paga' : 'Pendente'}
                          />
                          {item.paidAt ? (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {formatDateTime(item.paidAt)}
                            </Typography>
                          ) : null}
                        </Stack>
                      </TableCell>
                      <TableCell align="right">
                        <Amount
                          cents={item.amount}
                          visible={valuesVisible}
                          tone="expense"
                        />
                      </TableCell>
                      <TableCell align="right">
                        {item.status === 'PENDING' ? (
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => setPaying(item)}
                          >
                            Pagar
                          </Button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Paper>
        </>
      )}
      <PayPayableDialog
        payable={paying}
        visible={valuesVisible}
        loading={pay.isPending}
        onClose={() => {
          if (!pay.isPending) {
            setPaying(null);
          }
        }}
        onConfirm={(paidAt) => {
          if (!paying) return;
          pay.mutate({ id: paying.id, paidAt: toApiDateTime(paidAt) });
        }}
      />
    </>
  );
}
