'use client';
import { useRouter } from 'next/navigation';
import { TransactionForm } from '../../../../components/TransactionForm';

export default function NewTransactionPage() {
  const router = useRouter();
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">Movimentações</span>
          <h1>Novo lançamento</h1>
          <p>Registre uma entrada ou despesa. Parcelas são distribuídas nos próximos meses.</p>
        </div>
      </div>
      <TransactionForm onSaved={() => router.push('/lancamentos')} />
    </>
  );
}
