import Chart from 'chart.js/auto';
import zoomPlugin from 'chartjs-plugin-zoom';
import { chartToken } from './chart-tokens';

let applied = false;

/**
 * Fija el "cromo" común de todas las gráficas en `Chart.defaults` (el singleton de
 * chart.js/auto, el mismo que usa `<p-chart>` de PrimeNG): tooltip, color de grid,
 * color de ejes, tamaño de fuente base y `maintainAspectRatio`. Los componentes ya
 * no repiten esos bloques; sólo conservan overrides puntuales.
 *
 * Idempotente. La llaman los componentes de gráfica en su constructor —NO un
 * APP_INITIALIZER— para no arrastrar chart.js/auto (~200 kB) al bundle inicial:
 * así sólo vive en los chunks lazy de las tabs, como hasta ahora.
 *
 * NO fija `animation`: cada componente decide (mini-gráficas y baches animan; el
 * resto no).
 */
export function applyChartDefaults(): void {
  if (applied || typeof document === 'undefined') return;
  applied = true;

  // Zoom/pan/selección de área para la barra de herramientas (`<app-chart-toolbar>`). Inerte
  // hasta que una gráfica define `options.plugins.zoom` (lo hace `ChartFrame`), así que
  // registrarlo aquí no cambia el comportamiento de ninguna gráfica existente. Vive en este
  // archivo —el único que importa `chart.js/auto`— para no salir de los chunks lazy.
  Chart.register(zoomPlugin);

  const gridRaw = getComputedStyle(document.documentElement)
    .getPropertyValue('--chart-grid')
    .trim();
  if (!gridRaw) {
    console.warn(
      '[charts] chart-tokens.css no está cargado; Chart.defaults usa colores de respaldo.',
    );
  }

  Chart.defaults.maintainAspectRatio = false;
  Chart.defaults.color = chartToken('--chart-axis-text', '#6b7a99');
  Chart.defaults.font.size = 11;
  Chart.defaults.scale.grid.color = chartToken('--chart-grid', '#eef2f7');

  Object.assign(Chart.defaults.plugins.tooltip, {
    backgroundColor: chartToken('--chart-tooltip-bg', '#1f3a52'),
    titleColor: chartToken('--chart-tooltip-text', '#ffffff'),
    bodyColor: chartToken('--chart-tooltip-text', '#ffffff'),
    borderColor: chartToken('--chart-tooltip-border', '#2a4f6b'),
    borderWidth: 1,
    cornerRadius: 6,
    padding: 12,
  });
}
