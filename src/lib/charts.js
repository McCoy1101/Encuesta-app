/** Gráficas con Chart.js (MIT) usando la paleta clara y armónica de SurveyMonkey / Educación. */
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

Chart.defaults.font.family = "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif";
Chart.defaults.color = '#526071';
Chart.defaults.borderColor = '#e2e8f0';
Chart.defaults.plugins.legend.labels.usePointStyle = true;
Chart.defaults.plugins.tooltip.backgroundColor = '#1e293b';
Chart.defaults.plugins.tooltip.padding = 10;
Chart.defaults.plugins.tooltip.cornerRadius = 8;
Chart.defaults.maintainAspectRatio = false;

export const PALETTE = {
  teal: '#00966b',
  tealLight: '#059669',
  sky: '#0284c7',
  indigo: '#4f46e5',
  violet: '#6366f1',
  pink: '#8b5cf6',
  amber: '#d97706',
  red: '#e11d48',
  green: '#10b981',
};

// 9 niveles de la tabla comparativa con tonos suaves pero claros
export const LEVEL9 = [
  '#059669', // Muy alto (Esmeralda)
  '#10b981', // Alto
  '#34d399', // Por encima del promedio
  '#0ea5e9', // Promedio alto (Azul cielo)
  '#38bdf8', // Promedio
  '#f59e0b', // Promedio bajo (Ámbar suave)
  '#fb923c', // Por debajo del promedio
  '#f87171', // Bajo
  '#e11d48', // Muy bajo (Rojo sereno)
];

export const SERIES = [
  PALETTE.teal,
  PALETTE.sky,
  PALETTE.violet,
  PALETTE.amber,
  PALETTE.green,
  PALETTE.indigo,
  PALETTE.pink,
  PALETTE.red,
];

let instances = [];
export function destroyCharts() {
  instances.forEach((c) => c.destroy());
  instances = [];
}
export function chart(canvas, config) {
  if (!canvas) return null;
  const c = new Chart(canvas, config);
  instances.push(c);
  return c;
}

export const barOpts = (extra = {}) => ({
  responsive: true,
  plugins: { legend: { display: false }, ...(extra.plugins || {}) },
  scales: {
    x: { grid: { display: false }, ticks: { color: '#64748b' }, ...(extra.x || {}) },
    y: { beginAtZero: true, ticks: { precision: 0, color: '#64748b' }, grid: { color: '#f1f5f9' }, ...(extra.y || {}) },
  },
  borderRadius: 6,
  ...(extra.root || {}),
});
