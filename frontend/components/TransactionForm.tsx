'use client';

import { useQuery } from '@tanstack/react-query';
import { FormEvent, useState } from 'react';
import { z } from 'zod';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { ApiError, services } from '../lib/api';
import { DATE_FORMAT, parseApiDate, toApiDate } from '../lib/dates';
import { useFeedback } from '../lib/feedback';
import { queryKeys } from '../lib/query-keys';
import type { PaymentType, Transaction } from '../lib/types';
import { Feedback } from './Feedback';

const schema = z.object({
  type: z.enum(['INCOME', 'EXPENSE']),
  name: z.string().min(1, 'Informe um nome.'),
  amount: z.string().min(1, 'Informe o valor.'),
  categoryId: z.string().min(1, 'Escolha uma categoria.'),
  paymentType: z.enum(['CASH', 'INSTALLMENT']),
  installmentsCount: z.string().optional(),
});

const INSTALLMENT_OPTIONS = Array.from({ length: 23 }, (_, index) => index + 2);

const toCents = (value: string) => {
  const clean = value.trim().replace(/R\$\s?/g, '').replace(/\./g, '').replace(',', '.');
  return Math.round(Number(clean) * 100);
};
const fromCents = (cents: number) => (cents / 100).toFixed(2).replace('.', ',');

export function TransactionForm({ initial, onSaved }: { initial?: Transaction; onSaved: () => void }) {
  const { data: categories, isLoading } = useQuery({ queryKey: queryKeys.categories, queryFn: services.categories });
  const { notify } = useFeedback();
  const [payment, setPayment] = useState<PaymentType>(initial?.paymentType ?? 'CASH');
  const [date, setDate] = useState(() => parseApiDate(initial?.date));
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const raw = Object.fromEntries(new FormData(event.currentTarget)) as Record<string, string>;
    const checked = schema.safeParse(raw);
    if (!checked.success) return setError(checked.error.issues[0].message);
    if (!date?.isValid()) return setError('Informe uma data.');
    const amount = toCents(checked.data.amount);
    if (!Number.isInteger(amount) || amount <= 0) return setError('Informe um valor monetário válido.');
    const { installmentsCount, categoryId, ...base } = checked.data;
    const body: Record<string, unknown> = {
      ...base,
      categoryId: Number(categoryId),
      amount,
      date: toApiDate(date),
      ...(base.paymentType === 'INSTALLMENT' ? { installmentsCount: Number(installmentsCount) } : {}),
    };
    setPending(true);
    try {
      if (initial) {
        delete body.installmentsCount;
        delete body.paymentType;
        await services.updateTransaction(initial.id, body);
        notify('Lançamento atualizado.');
      } else {
        await services.createTransaction(body);
        notify('Lançamento salvo.');
      }
      onSaved();
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Não foi possível salvar o lançamento.');
    } finally {
      setPending(false);
    }
  }

  if (isLoading) {
    return (
      <Stack alignItems="center" sx={{ py: 8, gap: 2 }}>
        <CircularProgress size={28} />
        <Typography variant="caption">Carregando categorias…</Typography>
      </Stack>
    );
  }

  return (
    <Paper
      component="form"
      onSubmit={submit}
      sx={{ maxWidth: 720, p: 3.5, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}
    >
      <Feedback error={error} />
      <Stack spacing={2.5}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField select name="type" label="Tipo" defaultValue={initial?.type ?? 'EXPENSE'}>
            <MenuItem value="EXPENSE">Despesa</MenuItem>
            <MenuItem value="INCOME">Entrada</MenuItem>
          </TextField>
          <DatePicker
            label="Data"
            format={DATE_FORMAT}
            value={date}
            onChange={(value) => {
              if (value) setDate(value);
            }}
            slotProps={{ textField: { fullWidth: true } }}
          />
        </Stack>
        <TextField name="name" label="Nome do lançamento" defaultValue={initial?.name} placeholder="Ex.: Compra de mercado" />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField name="amount" label="Valor total (R$)" inputMode="decimal" defaultValue={initial ? fromCents(initial.amount) : ''} placeholder="0,00" />
          <TextField select name="categoryId" label="Categoria" defaultValue={initial ? String(initial.categoryId) : ''}>
            <MenuItem value="">Selecione</MenuItem>
            {categories?.map((category) => (
              <MenuItem key={category.id} value={String(category.id)}>
                {category.name}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          {initial?.installmentGroupId ? <input type="hidden" name="paymentType" value="INSTALLMENT" /> : null}
          <TextField
            select
            name="paymentType"
            label="Pagamento"
            value={initial?.installmentGroupId ? 'INSTALLMENT' : payment}
            disabled={Boolean(initial?.installmentGroupId)}
            onChange={(event) => setPayment(event.target.value as PaymentType)}
          >
            <MenuItem value="CASH">À vista</MenuItem>
            <MenuItem value="INSTALLMENT">Parcelado</MenuItem>
          </TextField>
          {!initial && payment === 'INSTALLMENT' ? (
            <TextField select name="installmentsCount" label="Parcelas" defaultValue="2">
              {INSTALLMENT_OPTIONS.map((value) => (
                <MenuItem key={value} value={value}>
                  {value}x
                </MenuItem>
              ))}
            </TextField>
          ) : null}
        </Stack>
        {initial?.installmentGroupId ? (
          <Typography color="text.secondary" variant="body2">
            Para preservar o total, parcelas não têm valor ou forma de pagamento editáveis.
          </Typography>
        ) : null}
        <Stack direction="row" justifyContent="flex-end" spacing={1.25} sx={{ pt: 1 }}>
          <Button type="button" variant="outlined" onClick={onSaved}>
            Cancelar
          </Button>
          <Button type="submit" variant="contained" disabled={pending}>
            {pending ? 'Salvando…' : initial ? 'Salvar alterações' : 'Salvar lançamento'}
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}
