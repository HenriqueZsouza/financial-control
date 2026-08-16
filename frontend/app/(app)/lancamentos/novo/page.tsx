'use client';

import { useRouter } from 'next/navigation';
import { PageHeader } from '../../../../components/PageHeader';
import { TransactionForm } from '../../../../components/TransactionForm';

export default function NewTransactionPage() {
  const router = useRouter();
  return (
    <>
      <PageHeader
        eyebrow="Movimentações"
        title="Novo lançamento"
        description="Registre uma entrada ou despesa. Parcelas são distribuídas nos próximos meses."
      />
      <TransactionForm onSaved={() => router.push('/lancamentos')} />
    </>
  );
}
