'use client';

import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Typography from '@mui/material/Typography';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { useState } from 'react';
import { Amount } from './Amount';
import { DATE_FORMAT, dayjs, type Dayjs } from '../lib/dates';

export function CloseInvoiceDialog({
  open,
  amount,
  visible,
  loading = false,
  onClose,
  onConfirm,
}: {
  open: boolean;
  amount: number;
  visible: boolean;
  loading?: boolean;
  onClose: () => void;
  onConfirm: (dueDate: Dayjs) => void;
}) {
  const [dueDate, setDueDate] = useState<Dayjs | null>(() => dayjs().add(10, 'day'));
  const canConfirm = Boolean(dueDate?.isValid()) && !loading;

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle>Fechar fatura</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 1.5 }}>
          A fatura em aberto vira uma conta a pagar na data de vencimento.
        </DialogContentText>
        <Typography
          variant="overline"
          display="block"
        >
          Total a fechar
        </Typography>
        <Amount
          cents={amount}
          visible={visible}
          tone="expense"
          sx={{ display: 'block', fontSize: 28, mb: 2.5 }}
        />
        <DatePicker
          label="Vencimento"
          format={DATE_FORMAT}
          value={dueDate}
          onChange={(value) => setDueDate(value)}
          slotProps={{
            textField: {
              fullWidth: true,
              autoFocus: true,
            },
          }}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          onClick={onClose}
          disabled={loading}
        >
          Cancelar
        </Button>
        <Button
          variant="contained"
          disabled={!canConfirm}
          onClick={() => {
            if (!dueDate?.isValid()) return;
            onConfirm(dueDate);
          }}
        >
          {loading ? 'Fechando…' : 'Confirmar fechamento'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
