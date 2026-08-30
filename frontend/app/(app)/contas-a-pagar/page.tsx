'use client';

import Alert from '@mui/material/Alert';
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
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Amount } from '../../../components/Amount';
import { Empty } from '../../../components/Empty';
import { PageHeader } from '../../../components/PageHeader';
import { PeriodFilter } from '../../../components/PeriodFilter';
import { services } from '../../../lib/api';
import { useAuth } from '../../../lib/auth';
import { currentPeriod, formatDate } from '../../../lib/dates';
import { queryKeys } from '../../../lib/query-keys';

export default function PayablesPage() {
  const [period, setPeriod] = useState(currentPeriod);
  const { valuesVisible } = useAuth();
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.payables(period.month, period.year),
    queryFn: () => services.payables(period.month, period.year),
  });

  return (
    <>
      <PageHeader
        eyebrow="Vencimentos"
        title="Contas a pagar"
        description="Contas com vencimento neste mês. O cadastro manual será liberado em breve; por enquanto elas nascem ao fechar a fatura do cartão."
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
              <Table sx={{ minWidth: 640 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Nome</TableCell>
                    <TableCell>Origem</TableCell>
                    <TableCell>Vencimento</TableCell>
                    <TableCell align="right">Valor</TableCell>
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
                      <TableCell align="right">
                        <Amount
                          cents={item.amount}
                          visible={valuesVisible}
                          tone="expense"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Paper>
        </>
      )}
    </>
  );
}
