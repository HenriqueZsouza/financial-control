'use client';

import { ArcElement, BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, Tooltip } from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import type { Summary } from '../lib/types';
import { money } from '../lib/format';
import { tokens } from '../lib/theme';
import { Empty } from './Empty';

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const barOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
  },
  scales: {
    x: { grid: { display: false }, border: { display: false }, ticks: { color: tokens.faint } },
    y: { grid: { color: tokens.line }, border: { display: false }, ticks: { color: tokens.faint, callback: (value: string | number) => `R$ ${value}` } },
  },
} as const;

export function DashboardCharts({ summary, visible }: { summary: Summary; visible: boolean }) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: 'minmax(260px, 0.85fr) minmax(300px, 1.15fr)' },
        gap: 2.25,
        mt: 2.25,
      }}
    >
      <Paper sx={{ p: 2.75, border: '1px solid', borderColor: 'divider', borderRadius: 2, minWidth: 0 }}>
        <Typography variant="h3" sx={{ mb: 2.5 }}>
          Entradas e saídas
        </Typography>
        <Box sx={{ height: 280, position: 'relative' }}>
          <Bar
            data={{
              labels: ['Entradas', 'Saídas'],
              datasets: [
                {
                  data: visible ? [summary.totalIncome / 100, summary.totalExpense / 100] : [0, 0],
                  backgroundColor: [tokens.income, tokens.expense],
                  borderRadius: 8,
                  maxBarThickness: 88,
                },
              ],
            }}
            options={{
              ...barOptions,
              plugins: {
                ...barOptions.plugins,
                tooltip: { callbacks: { label: (item) => (visible ? money(Math.round(Number(item.raw) * 100)) : 'Oculto') } },
              },
            }}
          />
        </Box>
      </Paper>
      <Paper sx={{ p: 2.75, border: '1px solid', borderColor: 'divider', borderRadius: 2, minWidth: 0 }}>
        <Typography variant="h3" sx={{ mb: 2.5 }}>
          Despesas por categoria
        </Typography>
        <Box sx={{ height: 280, position: 'relative' }}>
          {summary.byCategory.length ? (
            <Doughnut
              data={{
                labels: summary.byCategory.map((item) => item.name),
                datasets: [
                  {
                    data: visible ? summary.byCategory.map((item) => item.total / 100) : summary.byCategory.map(() => 1),
                    backgroundColor: [...tokens.categoryRamp],
                    borderColor: '#ffffff',
                    borderWidth: 2,
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                cutout: '62%',
                plugins: {
                  legend: {
                    position: 'bottom',
                    labels: { color: tokens.muted, boxWidth: 10, boxHeight: 10, usePointStyle: true, padding: 14 },
                  },
                  tooltip: {
                    callbacks: { label: (item) => (visible ? `${item.label}: ${money(Math.round(Number(item.raw) * 100))}` : `${item.label}: oculto`) },
                  },
                },
              }}
            />
          ) : (
            <Empty>Ainda não há despesas neste período.</Empty>
          )}
        </Box>
      </Paper>
    </Box>
  );
}
