'use client';

import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Typography from '@mui/material/Typography';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { useEffect, useState } from 'react';
import { Amount } from './Amount';
import { DATE_FORMAT, dayjs, type Dayjs } from '../lib/dates';
import type { Payable } from '../lib/types';

export function PayPayableDialog({
  payable,
  visible,
  loading = false,
  onClose,
  onConfirm,
}: {
  payable: Payable | null;
  visible: boolean;
  loading?: boolean;
  onClose: () => void;
  onConfirm: (paidAt: Dayjs) => void;
}) {
  const [paidAt, setPaidAt] = useState<Dayjs | null>(() => dayjs());
  const canConfirm = Boolean(paidAt?.isValid()) && !loading;

  useEffect(() => {
    if (payable) {
      setPaidAt(dayjs());
    }
  }, [payable]);

  return (
    <Dialog
      open={Boolean(payable)}
      onClose={loading ? undefined : onClose}
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle>Pagar conta</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 1.5 }}>
          {payable?.name ?? 'Conta a pagar'} vira uma despesa à vista e o valor sai do saldo.
        </DialogContentText>
        <Typography
          variant="overline"
          display="block"
        >
          Valor
        </Typography>
        <Amount
          cents={payable?.amount ?? 0}
          visible={visible}
          tone="expense"
          sx={{ display: 'block', fontSize: 28, mb: 2.5 }}
        />
        <DatePicker
          label="Data do pagamento"
          format={DATE_FORMAT}
          value={paidAt}
          onChange={(value) => setPaidAt(value)}
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
            if (!paidAt?.isValid()) return;
            onConfirm(paidAt);
          }}
        >
          {loading ? 'Pagando…' : 'Confirmar pagamento'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
