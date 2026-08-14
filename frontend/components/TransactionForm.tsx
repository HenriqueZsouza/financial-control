'use client';
import { useQuery } from '@tanstack/react-query';
import { FormEvent, useState } from 'react';
import { z } from 'zod';
import { ApiError, services } from '../lib/api';
import type { Transaction } from '../lib/types';
import { Feedback } from './Feedback';

const schema = z.object({
  type: z.enum(['INCOME', 'EXPENSE']),
  name: z.string().min(1, 'Informe um nome.'),
  amount: z.string().min(1, 'Informe o valor.'),
  categoryId: z.string().min(1, 'Escolha uma categoria.'),
  paymentType: z.enum(['CASH', 'INSTALLMENT']),
  installmentsCount: z.string(),
  date: z.string().min(1, 'Informe uma data.'),
});
const toCents = (value: string) => {
  const clean = value.trim().replace(/R\$\s?/g, '').replace(/\./g, '').replace(',', '.');
  return Math.round(Number(clean) * 100);
};
const fromCents = (cents: number) => (cents / 100).toFixed(2).replace('.', ',');

export function TransactionForm({ initial, onSaved }: { initial?: Transaction; onSaved: () => void }) {
  const { data: categories, isLoading } = useQuery({ queryKey: ['categories'], queryFn: services.categories });
  const [payment, setPayment] = useState(initial?.paymentType ?? 'CASH');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const raw = Object.fromEntries(new FormData(event.currentTarget)) as Record<string, string>;
    const checked = schema.safeParse(raw);
    if (!checked.success) return setError(checked.error.issues[0].message);
    const amount = toCents(checked.data.amount);
    if (!Number.isInteger(amount) || amount <= 0) return setError('Informe um valor monetário válido.');
    const { installmentsCount, categoryId, ...base } = checked.data;
    const body: Record<string, unknown> = {
      ...base,
      categoryId: Number(categoryId),
      amount,
      ...(base.paymentType === 'INSTALLMENT' ? { installmentsCount: Number(installmentsCount) } : {}),
    };
    setPending(true);
    try {
      if (initial) {
        delete body.installmentsCount;
        delete body.paymentType;
        await services.updateTransaction(initial.id, body);
      } else await services.createTransaction(body);
      onSaved();
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Não foi possível salvar o lançamento.');
    } finally {
      setPending(false);
    }
  }

  if (isLoading) return <div className="loading">Carregando categorias…</div>;

  return (
    <form className="form-card" onSubmit={submit}>
      <Feedback error={error} />
      <div className="fields-two">
        <div className="field">
          <label htmlFor="type">Tipo</label>
          <select id="type" name="type" defaultValue={initial?.type ?? 'EXPENSE'}>
            <option value="EXPENSE">Despesa</option>
            <option value="INCOME">Entrada</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="date">Data</label>
          <input
            id="date"
            name="date"
            type="date"
            defaultValue={initial?.date.slice(0, 10) ?? new Date().toISOString().slice(0, 10)}
          />
        </div>
      </div>
      <div className="field">
        <label htmlFor="name">Nome do lançamento</label>
        <input id="name" name="name" defaultValue={initial?.name} placeholder="Ex.: Compra de mercado" />
      </div>
      <div className="fields-two">
        <div className="field">
          <label htmlFor="amount">Valor total (R$)</label>
          <input id="amount" name="amount" inputMode="decimal" defaultValue={initial ? fromCents(initial.amount) : ''} placeholder="0,00" />
        </div>
        <div className="field">
          <label htmlFor="categoryId">Categoria</label>
          <select id="categoryId" name="categoryId" defaultValue={initial?.categoryId ?? ''}>
            <option value="">Selecione</option>
            {categories?.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="fields-two">
        <div className="field">
          <label htmlFor="paymentType">Pagamento</label>
          <select
            id="paymentType"
            name="paymentType"
            value={initial?.installmentGroupId ? 'INSTALLMENT' : payment}
            disabled={Boolean(initial?.installmentGroupId)}
            onChange={(event) => setPayment(event.target.value as 'CASH' | 'INSTALLMENT')}
          >
            <option value="CASH">À vista</option>
            <option value="INSTALLMENT">Parcelado</option>
          </select>
        </div>
        {!initial && payment === 'INSTALLMENT' && (
          <div className="field">
            <label htmlFor="installmentsCount">Parcelas</label>
            <select id="installmentsCount" name="installmentsCount" defaultValue="2">
              {Array.from({ length: 23 }, (_, index) => index + 2).map((value) => (
                <option key={value} value={value}>
                  {value}x
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      {initial?.installmentGroupId && (
        <p className="hint">Para preservar o total, parcelas não têm valor ou forma de pagamento editáveis.</p>
      )}
      <div className="form-actions">
        <button type="button" className="secondary" onClick={onSaved}>
          Cancelar
        </button>
        <button className="primary" disabled={pending}>
          {pending ? 'Salvando…' : initial ? 'Salvar alterações' : 'Salvar lançamento'}
        </button>
      </div>
    </form>
  );
}
