'use client';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import NextLink from 'next/link';
import { useState } from 'react';
import { Amount } from './Amount';
import { CloseInvoiceDialog } from './CloseInvoiceDialog';
import { ApiError, services } from '../lib/api';
import { toApiDate, type Dayjs } from '../lib/dates';
import { useFeedback } from '../lib/feedback';
import { queryKeys } from '../lib/query-keys';

export function OpenInvoiceCard({ visible }: { visible: boolean }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { notify } = useFeedback();
  const client = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.openInvoice,
    queryFn: services.openCreditCardInvoice,
  });
  const closeInvoice = useMutation({
    mutationFn: (dueDate: string) => services.closeCreditCardInvoice(dueDate),
    onSuccess: async () => {
      notify('Fatura fechada. A conta a pagar foi lançada.');
      setDialogOpen(false);
      await Promise.all([
        client.invalidateQueries({ queryKey: queryKeys.openInvoice }),
        client.invalidateQueries({ queryKey: ['payables'] }),
        client.invalidateQueries({ queryKey: ['credit-card'] }),
        client.invalidateQueries({ queryKey: ['transactions'] }),
      ]);
    },
    onError: (cause) => {
      notify(cause instanceof ApiError ? cause.message : 'Não foi possível fechar a fatura.', 'error');
    },
  });

  const hasOpen = (data?.total ?? 0) > 0;

  return (
    <>
      <Paper
        sx={{
          p: { xs: 3, md: 3.25 },
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
        }}
      >
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'stretch', sm: 'flex-start' }}
          spacing={2}
        >
          <Box>
            <Typography variant="overline">Cartão de crédito</Typography>
            <Typography
              variant="h3"
              sx={{ mt: 0.5 }}
            >
              Fatura em aberto
            </Typography>
          </Box>
          <Stack
            direction="row"
            spacing={1}
            justifyContent="flex-end"
          >
            <Button
              component={NextLink}
              href="/cartao-credito"
              variant="text"
            >
              Ver relatório
            </Button>
            <Tooltip title={hasOpen ? '' : 'Nenhuma compra em aberto para fechar.'}>
              <span>
                <Button
                  variant="contained"
                  disabled={!hasOpen || isLoading}
                  onClick={() => setDialogOpen(true)}
                >
                  Fechar fatura
                </Button>
              </span>
            </Tooltip>
          </Stack>
        </Stack>
        {isLoading ? (
          <Stack
            alignItems="center"
            sx={{ py: 4 }}
          >
            <CircularProgress size={22} />
          </Stack>
        ) : error || !data ? (
          <Alert
            severity="error"
            sx={{ mt: 2 }}
          >
            Não foi possível carregar a fatura em aberto.
          </Alert>
        ) : data.total === 0 ? (
          <Typography
            color="text.secondary"
            sx={{ mt: 2 }}
          >
            Nenhuma compra em aberto para fechar.
          </Typography>
        ) : (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' },
              gap: '1px',
              mt: 3,
              bgcolor: 'divider',
              borderRadius: 1,
              overflow: 'hidden',
            }}
          >
            <InvoiceStat
              label="Total em aberto"
              cents={data.total}
              visible={visible}
              hint={`${data.itemCount} ${data.itemCount === 1 ? 'compra' : 'compras'}`}
            />
            <InvoiceStat
              label="À vista (1x)"
              cents={data.totalCredit1x}
              visible={visible}
              hint={`${data.credit1xCount} ${data.credit1xCount === 1 ? 'compra' : 'compras'}`}
            />
            <InvoiceStat
              label="Parceladas"
              cents={data.totalInstallment}
              visible={visible}
              hint={`${data.installmentCount} ${data.installmentCount === 1 ? 'parcela' : 'parcelas'}`}
            />
          </Box>
        )}
      </Paper>
      <CloseInvoiceDialog
        open={dialogOpen}
        amount={data?.total ?? 0}
        visible={visible}
        loading={closeInvoice.isPending}
        onClose={() => {
          if (!closeInvoice.isPending) setDialogOpen(false);
        }}
        onConfirm={(dueDate: Dayjs) => closeInvoice.mutate(toApiDate(dueDate))}
      />
    </>
  );
}

function InvoiceStat({
  label,
  cents,
  visible,
  hint,
}: {
  label: string;
  cents: number;
  visible: boolean;
  hint: string;
}) {
  return (
    <Box sx={{ bgcolor: 'background.paper', p: 2.25 }}>
      <Typography variant="overline">{label}</Typography>
      <Amount
        cents={cents}
        visible={visible}
        tone="expense"
        sx={{ display: 'block', fontSize: 24, mt: 1 }}
      />
      <Typography
        variant="caption"
        color="text.secondary"
        display="block"
        sx={{ mt: 0.5 }}
      >
        {hint}
      </Typography>
    </Box>
  );
}
