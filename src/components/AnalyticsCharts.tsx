import { useEffect, useRef, useState } from 'react';
import {
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  DoughnutController,
  Legend,
  LinearScale,
  Tooltip,
} from 'chart.js';
import type { KishiTask } from '@/src/types/kishi';

Chart.register(
  DoughnutController,
  BarController,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
);

interface AnalyticsChartsProps {
  tasks: KishiTask[];
}

export function AnalyticsCharts({ tasks }: AnalyticsChartsProps) {
  const [productFilter, setProductFilter] = useState<'Geral' | 'Rides' | 'Food'>('Geral');
  const doughnutCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const barCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const doughnutChartRef = useRef<Chart | null>(null);
  const barChartRef = useRef<Chart | null>(null);

  useEffect(() => {
    const canvas = doughnutCanvasRef.current;
    if (!canvas) return;

    doughnutChartRef.current?.destroy();

    const ridesTotal = tasks.filter((t) => t.product === '99 Rides').length;
    const foodTotal = tasks.filter((t) => t.product === '99 Food').length;

    doughnutChartRef.current = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: ['99 Rides', '99 Food'],
        datasets: [
          {
            data: [ridesTotal, foodTotal],
            backgroundColor: ['#C5A66B', '#A9B99D'],
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: '#EDE9DE',
              boxWidth: 12,
              padding: 14,
              font: { family: 'Plus Jakarta Sans', size: 11 },
            },
          },
        },
      },
    });

    return () => {
      doughnutChartRef.current?.destroy();
    };
  }, [tasks]);

  useEffect(() => {
    const canvas = barCanvasRef.current;
    if (!canvas) return;

    barChartRef.current?.destroy();

    let filtered = tasks;
    if (productFilter === 'Rides') {
      filtered = tasks.filter((t) => t.product === '99 Rides');
    } else if (productFilter === 'Food') {
      filtered = tasks.filter((t) => t.product === '99 Food');
    }

    const extCount = filtered.filter((t) => t.channelType === 'Externo').length;
    const intCount = filtered.filter((t) => t.channelType === 'Interno').length;
    const noneCount = filtered.filter((t) => t.channelType === 'Nenhum' || !t.channelType).length;

    barChartRef.current = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: ['Canais Externos (CPB)', 'Canais Internos / Diretos', 'Demanda Geral'],
        datasets: [
          {
            label: 'Demandas',
            data: [extCount, intCount, noneCount],
            backgroundColor: ['#C5A66B', '#A9B99D', '#777F89'],
            borderRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              color: '#EDE9DE',
              stepSize: 1,
              font: { family: 'JetBrains Mono', size: 10 },
            },
            grid: { color: 'rgba(119, 127, 137, 0.15)' },
          },
          x: {
            ticks: {
              color: '#EDE9DE',
              font: { family: 'Plus Jakarta Sans', size: 10 },
              maxRotation: 0,
              minRotation: 0,
            },
            grid: { display: false },
          },
        },
        plugins: {
          legend: { display: false },
        },
      },
    });

    return () => {
      barChartRef.current?.destroy();
    };
  }, [tasks, productFilter]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <div className="bg-[#151d18] border border-[#777F89]/40 rounded-2xl p-5 flex flex-col justify-between">
        <div>
          <h4 className="text-xs font-bold text-[#EDE9DE] tracking-wide">
            Demandas Globais (Food vs. Rides)
          </h4>
          <p className="text-[11px] text-[#A9B99D] mt-0.5">
            Volume de tarefas ativas por produto.
          </p>
        </div>
        <div className="h-52 my-2 flex items-center justify-center">
          <canvas ref={doughnutCanvasRef} />
        </div>
      </div>

      <div className="bg-[#151d18] border border-[#777F89]/40 rounded-2xl p-5 flex flex-col justify-between">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h4 className="text-xs font-bold text-[#EDE9DE] tracking-wide">
              Canais Externos vs. Internos
            </h4>
            <p className="text-[11px] text-[#A9B99D] mt-0.5">
              Distribuição das demandas por tipo de canal.
            </p>
          </div>
          <select
            value={productFilter}
            onChange={(e) => setProductFilter(e.target.value as 'Geral' | 'Rides' | 'Food')}
            className="bg-[#0b100d] border border-[#777F89]/60 text-xs text-[#C5A66B] rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-[#C5A66B]"
            aria-label="Filtrar gráfico por produto"
          >
            <option value="Geral">Visão Geral (Ambos)</option>
            <option value="Rides">Filtrar: 99 Rides</option>
            <option value="Food">Filtrar: 99 Food</option>
          </select>
        </div>
        <div className="h-52 my-2">
          <canvas ref={barCanvasRef} />
        </div>
      </div>
    </div>
  );
}
