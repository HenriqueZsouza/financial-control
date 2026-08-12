'use client';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { DashboardCharts } from '../../components/DashboardCharts';
import { PeriodFilter } from '../../components/PeriodFilter';
import { Empty } from '../../components/Empty';
import { services } from '../../lib/api';
import { currentPeriod, money } from '../../lib/format';
import { useAuth } from '../../lib/auth';
export default function DashboardPage() { const [period, setPeriod] = useState(currentPeriod); const { valuesVisible, setValuesVisible } = useAuth(); const { data, isLoading, error } = useQuery({ queryKey: ['summary', period], queryFn: () => services.summary(period.month, period.year) });
  return <><div className="page-heading"><div><h1>Olá, sua visão do mês</h1><p>Acompanhe o que entrou e saiu no período escolhido.</p></div><PeriodFilter {...period} onChange={setPeriod} /></div>{isLoading ? <div className="loading">Carregando indicadores…</div> : error || !data ? <div className="panel"><Empty>Não foi possível carregar o resumo. Verifique se a API está disponível.</Empty></div> : <><div className="cards"><article className="card"><span className="card-label">Saldo disponível</span><button className="eye" aria-label={valuesVisible ? 'Ocultar valores' : 'Mostrar valores'} onClick={() => setValuesVisible(!valuesVisible)}>{valuesVisible ? '◉' : '◌'}</button><div className={`card-value ${data.balance >= 0 ? 'positive' : 'negative'}`}>{money(data.balance, valuesVisible)}</div></article><article className="card"><span className="card-label">Total de entradas</span><div className="card-value positive">{money(data.totalIncome, valuesVisible)}</div></article><article className="card"><span className="card-label">Total de saídas</span><div className="card-value negative">{money(data.totalExpense, valuesVisible)}</div></article></div><DashboardCharts summary={data} visible={valuesVisible} /></>}</>; }
