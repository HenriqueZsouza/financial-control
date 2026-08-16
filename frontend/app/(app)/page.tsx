'use client';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import dynamic from 'next/dynamic';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Amount } from '../../components/Amount';
import { PageHeader } from '../../components/PageHeader';
import { PeriodFilter } from '../../components/PeriodFilter';
import { services } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { currentPeriod, months } from '../../lib/dates';
import { queryKeys } from '../../lib/query-keys';

const DashboardCharts = dynamic(() => import('../../components/DashboardCharts').then((mod) => mod.DashboardCharts), {
  ssr: false,
  loading: () => (
    <Stack alignItems="center" sx={{ py: 8 }}>
      <CircularProgress size={24} />
    </Stack>
  ),
});

export default function DashboardPage() {
  const [period, setPeriod] = useState(currentPeriod);
  const { valuesVisible, setValuesVisible } = useAuth();
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.summary(period.month, period.year),
    queryFn: () => services.summary(period.month, period.year),
  });

  return (
    <>
      <PageHeader
        eyebrow="Visão do mês"
        title="Seu resumo financeiro"
        description="Acompanhe o que entrou e saiu no período escolhido."
        action={<PeriodFilter {...period} onChange={setPeriod} />}
      />
      {isLoading ? (
        <Stack alignItems="center" sx={{ py: 8, gap: 2 }}>
          <CircularProgress size={28} />
          <Typography variant="caption">Carregando indicadores…</Typography>
        </Stack>
      ) : error || !data ? (
        <Alert severity="error">Não foi possível carregar o resumo. Verifique se a API está disponível.</Alert>
      ) : (
        <>
          <Paper sx={{ p: { xs: 3, md: 4 }, border: '1px solid', borderColor: 'divider', borderRadius: 2, mb: 2.5 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" gap={2}>
              <Typography variant="overline">
                Saldo disponível · {months[period.month - 1]} {period.year}
              </Typography>
              <Chip
                clickable
                onClick={() => setValuesVisible(!valuesVisible)}
                icon={valuesVisible ? <VisibilityOffOutlinedIcon /> : <VisibilityOutlinedIcon />}
                label={valuesVisible ? 'Ocultar' : 'Mostrar'}
                variant="outlined"
              />
            </Stack>
            <Amount
              cents={data.balance}
              visible={valuesVisible}
              tone="auto"
              sx={{ display: 'block', fontSize: { xs: 44, md: 68 }, letterSpacing: '-0.04em', lineHeight: 1, mt: 2, mb: 0.5 }}
            />
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                gap: '1px',
                mt: 3,
                bgcolor: 'divider',
                borderRadius: 1,
                overflow: 'hidden',
              }}
            >
              <Box sx={{ bgcolor: 'background.paper', p: 2.25 }}>
                <Typography variant="overline">Total de entradas</Typography>
                <Amount cents={data.totalIncome} visible={valuesVisible} tone="income" sign="+" sx={{ display: 'block', fontSize: 24, mt: 1 }} />
              </Box>
              <Box sx={{ bgcolor: 'background.paper', p: 2.25 }}>
                <Typography variant="overline">Total de saídas</Typography>
                <Amount cents={data.totalExpense} visible={valuesVisible} tone="expense" sign="−" sx={{ display: 'block', fontSize: 24, mt: 1 }} />
              </Box>
            </Box>
          </Paper>
          <DashboardCharts summary={data} visible={valuesVisible} />
        </>
      )}
    </>
  );
}
