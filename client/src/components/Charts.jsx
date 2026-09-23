/** Data visualisation components (Chart.js via react-chartjs-2). */
import {
  Chart as ChartJS, RadialLinearScale, CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Filler, Tooltip, Legend,
} from 'chart.js';
import { Radar, Bar, Doughnut, Line } from 'react-chartjs-2';
import { Report } from '../models';

ChartJS.register(RadialLinearScale, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Filler, Tooltip, Legend);

export const COLORS = {
  green: '#198754', greenA: 'rgba(25,135,84,.25)', yellow: '#ffc107', red: '#dc3545', blue: '#0d6efd',
  teal: '#20c997', gray: '#6c757d', palette: ['#198754', '#0d6efd', '#ffc107', '#dc3545', '#20c997', '#6f42c1', '#fd7e14', '#6c757d'],
};

/** Radar of the five scouting ratings (one or more datasets). */
export function RatingsRadar({ datasets, height = 280 }) {
  const labels = Report.RATING_KEYS.map((k) => Report.RATING_LABELS[k]);
  const data = {
    labels,
    datasets: datasets.map((d, i) => ({
      label: d.label,
      data: Report.RATING_KEYS.map((k) => d.ratings?.[k] ?? 0),
      backgroundColor: i === 0 ? COLORS.greenA : 'rgba(13,110,253,.15)',
      borderColor: i === 0 ? COLORS.green : COLORS.blue,
      pointBackgroundColor: i === 0 ? COLORS.green : COLORS.blue,
      borderWidth: 2,
    })),
  };
  return (
    <div style={{ height }}>
      <Radar
        data={data}
        options={{
          maintainAspectRatio: false,
          scales: { r: { min: 0, max: 10, ticks: { stepSize: 2, backdropColor: 'transparent' } } },
          plugins: { legend: { display: datasets.length > 1, position: 'bottom' } },
        }}
      />
    </div>
  );
}

export function BarChart({ labels, values, label, color = COLORS.green, horizontal = false, height = 260, max }) {
  return (
    <div style={{ height }}>
      <Bar
        data={{ labels, datasets: [{ label, data: values, backgroundColor: color, borderRadius: 4 }] }}
        options={{
          maintainAspectRatio: false,
          indexAxis: horizontal ? 'y' : 'x',
          plugins: { legend: { display: false } },
          scales: { [horizontal ? 'x' : 'y']: { beginAtZero: true, ...(max ? { max } : {}), ticks: { precision: 0 } } },
        }}
      />
    </div>
  );
}

export function DoughnutChart({ labels, values, colors = COLORS.palette, height = 260 }) {
  return (
    <div style={{ height }}>
      <Doughnut
        data={{ labels, datasets: [{ data: values, backgroundColor: colors, borderWidth: 1 }] }}
        options={{ maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }}
      />
    </div>
  );
}

export function LineChart({ labels, datasets, height = 240, yMax }) {
  return (
    <div style={{ height }}>
      <Line
        data={{
          labels,
          datasets: datasets.map((d, i) => ({
            ...d, borderColor: COLORS.palette[i], backgroundColor: COLORS.palette[i], tension: 0.3, fill: false,
          })),
        }}
        options={{ maintainAspectRatio: false, scales: { y: { beginAtZero: true, ...(yMax ? { max: yMax } : {}) } }, plugins: { legend: { position: 'bottom' } } }}
      />
    </div>
  );
}
