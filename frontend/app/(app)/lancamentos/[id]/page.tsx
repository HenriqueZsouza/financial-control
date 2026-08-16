'use client';

import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { PageHeader } from '../../../../components/PageHeader';
import { TransactionForm } from '../../../../components/TransactionForm';
import { services } from '../../../../lib/api';
import { queryKeys } from '../../../../lib/query-keys';

export default function EditTransactionPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.transaction(id),
    queryFn: () => services.transaction(id),
  });

  if (isLoading) {
    return (
      <Stack alignItems="center" sx={{ py: 8, gap: 2 }}>
        <CircularProgress size={28} />
        <Typography variant="caption">Carregando lançamento…</Typography>
      </Stack>
    );
  }

  if (error || !data) {
    return <Alert severity="error">Não foi possível encontrar este lançamento.</Alert>;
  }

  return (
    <>
      <PageHeader eyebrow="Movimentações" title="Editar lançamento" description="Atualize os dados necessários." />
      <TransactionForm initial={data.transaction} onSaved={() => router.push('/lancamentos')} />
    </>
  );
}
