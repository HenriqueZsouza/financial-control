'use client';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { TransactionForm } from '../../../../components/TransactionForm';
import { services } from '../../../../lib/api';
export default function EditTransactionPage() { const { id } = useParams<{ id: string }>(); const router = useRouter(); const { data, isLoading, error } = useQuery({ queryKey: ['transaction', id], queryFn: () => services.transaction(id) }); if (isLoading) return <div className="loading">Carregando lançamento…</div>; if (error || !data) return <div className="panel"><p>Não foi possível encontrar este lançamento.</p></div>; return <><div className="page-heading"><div><h1>Editar lançamento</h1><p>Atualize os dados necessários.</p></div></div><TransactionForm initial={data.transaction} onSaved={() => router.push('/lancamentos')} /></>; }
