'use client';
import { ArcElement, BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, Tooltip } from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import type { Summary } from '../lib/types';
ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const INCOME = '#157f52';
const EXPENSE = '#c4353a';
const GRID = '#e6e9ed';
const TICK = '#9aa1ac';
const categoryRamp = ['#8f2b2f', '#b0353a', '#c4353a', '#d1584f', '#dd7a6d', '#e69c8f', '#efc0b5', '#f6ddd7'];
const brl = (value: number) => `R$ ${Number(value).toFixed(2).replace('.', ',')}`;

export function DashboardCharts({ summary, visible }: { summary: Summary; visible: boolean }) {
  return (
    <div className="grid-two">
      <section className="panel">
        <h2>Entradas e saídas</h2>
        <div className="chart">
          <Bar
            data={{
              labels: ['Entradas', 'Saídas'],
              datasets: [
                {
                  data: visible ? [summary.totalIncome / 100, summary.totalExpense / 100] : [0, 0],
                  backgroundColor: [INCOME, EXPENSE],
                  borderRadius: 8,
                  maxBarThickness: 88,
                },
              ],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: (item) => (visible ? brl(Number(item.raw)) : 'Oculto') } },
              },
              scales: {
                x: { grid: { display: false }, border: { display: false }, ticks: { color: TICK } },
                y: { grid: { color: GRID }, border: { display: false }, ticks: { color: TICK, callback: (value) => `R$ ${value}` } },
              },
            }}
          />
        </div>
      </section>
      <section className="panel">
        <h2>Despesas por categoria</h2>
        <div className="chart">
          {summary.byCategory.length ? (
            <Doughnut
              data={{
                labels: summary.byCategory.map((item) => item.name),
                datasets: [
                  {
                    data: visible ? summary.byCategory.map((item) => item.total / 100) : summary.byCategory.map(() => 1),
                    backgroundColor: categoryRamp,
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
                  legend: { position: 'bottom', labels: { color: '#6b7280', boxWidth: 10, boxHeight: 10, usePointStyle: true, padding: 14 } },
                  tooltip: {
                    callbacks: { label: (item) => (visible ? `${item.label}: ${brl(Number(item.raw))}` : `${item.label}: oculto`) },
                  },
                },
              }}
            />
          ) : (
            <div className="empty">Ainda não há despesas neste período.</div>
          )}
        </div>
      </section>
    </div>
  );
}
