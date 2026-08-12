'use client';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { DashboardCharts } from '../../components/DashboardCharts';
import { PeriodFilter } from '../../components/PeriodFilter';
import { Empty } from '../../components/Empty';
import { Amount } from '../../components/Amount';
import { EyeIcon, EyeOffIcon } from '../../components/icons';
import { services } from '../../lib/api';
import { currentPeriod, months } from '../../lib/format';
import { useAuth } from '../../lib/auth';

export default function DashboardPage() {
  const [period, setPeriod] = useState(currentPeriod);
  const { valuesVisible, setValuesVisible } = useAuth();
  const { data, isLoading, error } = useQuery({
    queryKey: ['summary', period],
    queryFn: () => services.summary(period.month, period.year),
  });

  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">Visão do mês</span>
          <h1>Seu resumo financeiro</h1>
          <p>Acompanhe o que entrou e saiu no período escolhido.</p>
        </div>
        <PeriodFilter {...period} onChange={setPeriod} />
      </div>
      {isLoading ? (
        <div className="loading">Carregando indicadores…</div>
      ) : error || !data ? (
        <div className="panel">
          <Empty>Não foi possível carregar o resumo. Verifique se a API está disponível.</Empty>
        </div>
      ) : (
        <>
          <section className="hero">
            <div className="hero-head">
              <span className="eyebrow">
                Saldo disponível · {months[period.month - 1]} {period.year}
              </span>
              <button className="hero-toggle" onClick={() => setValuesVisible(!valuesVisible)}>
                {valuesVisible ? <EyeOffIcon /> : <EyeIcon />}
                {valuesVisible ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
            <div className={`hero-value ${data.balance >= 0 ? 'positive' : 'negative'} ${valuesVisible ? '' : 'is-private'}`}>
              <Amount cents={data.balance} visible />
            </div>
            <div className="hero-stats">
              <div className="stat">
                <span className="eyebrow">Total de entradas</span>
                <Amount className="stat-value" cents={data.totalIncome} visible={valuesVisible} tone="income" sign="+" />
              </div>
              <div className="stat">
                <span className="eyebrow">Total de saídas</span>
                <Amount className="stat-value" cents={data.totalExpense} visible={valuesVisible} tone="expense" sign="−" />
              </div>
            </div>
          </section>
          <DashboardCharts summary={data} visible={valuesVisible} />
        </>
      )}
    </>
  );
}
