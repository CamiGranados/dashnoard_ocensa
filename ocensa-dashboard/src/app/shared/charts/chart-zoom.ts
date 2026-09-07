import type { Chart, UpdateMode } from 'chart.js';
// Import de tipo desde la raíz: activa el `declare module 'chart.js'` del plugin
// (añade chart.zoom / chart.resetZoom / chart.getZoomLevel / chart.getZoomedScaleBounds…).
import type {} from 'chartjs-plugin-zoom';
import type { ZoomPluginOptions } from 'chartjs-plugin-zoom/types/options';
import type { ChartInteractionMode, ChartViewState, ChartZoomBounds } from './chart-view-state';

/**
 * Capa tipada sobre `chartjs-plugin-zoom` para la barra de herramientas (`<app-chart-toolbar>`).
 * El plugin se registra en `chart-defaults.ts` (junto a `chart.js/auto`, chunk lazy) y es inerte
 * hasta que `options.plugins.zoom` se define: `ChartFrame` lo inyecta con `buildZoomOptions()`.
 *
 * Nada de `any`. El color del rectángulo de selección es "cromo" de gráfica (no una variable de
 * dominio) y vive aquí como constante, igual que los fallbacks de `chart-defaults.ts`.
 */

/** `--color-primary` (#1c4463) al 14 % / 45 % para el rectángulo de "selección de área". */
const DRAG_FILL = 'rgba(28, 68, 99, 0.14)';
const DRAG_BORDER = 'rgba(28, 68, 99, 0.45)';

/** Factor por clic de zoom +/−. 1.35 ≈ un paso perceptible sin marear. */
const ZOOM_STEP = 1.35;

export type ZoomAxisMode = 'x' | 'y' | 'xy';

export interface BuildZoomOptions {
  /** Modo activo de la barra: `pan` habilita arrastrar-mover; `select`, arrastrar-rectángulo. */
  mode: ChartInteractionMode;
  /** Ejes sobre los que actúan zoom y pan. Por defecto `'x'`. `'xy'` para gráficas de doble eje libre. */
  axisMode?: ZoomAxisMode;
  /** Habilitar zoom con Ctrl + rueda del ratón (sin Ctrl no hace nada, para no secuestrar el scroll). */
  wheel?: boolean;
  onZoomComplete?: (chart: Chart) => void;
  onPanComplete?: (chart: Chart) => void;
}

/** Config `plugins.zoom` para fusionar en las `options` de la gráfica. */
export function buildZoomOptions(opts: BuildZoomOptions): ZoomPluginOptions {
  const axis = opts.axisMode ?? 'x';
  const isSelect = opts.mode === 'select';

  return {
    pan: {
      enabled: !isSelect,
      mode: axis,
      threshold: 8,
      onPanComplete: opts.onPanComplete ? ({ chart }) => opts.onPanComplete!(chart) : undefined,
    },
    zoom: {
      mode: axis,
      wheel: { enabled: opts.wheel ?? true, modifierKey: 'ctrl' },
      drag: isSelect
        ? {
            enabled: true,
            backgroundColor: DRAG_FILL,
            borderColor: DRAG_BORDER,
            borderWidth: 1,
            threshold: 8,
          }
        : { enabled: false },
      pinch: { enabled: false },
      onZoomComplete: opts.onZoomComplete ? ({ chart }) => opts.onZoomComplete!(chart) : undefined,
    },
    // No se puede alejar/desplazar más allá de los datos originales.
    limits: { x: { min: 'original', max: 'original' }, y: { min: 'original', max: 'original' } },
  };
}

/** El plugin `chartjs-plugin-zoom` está registrado (lo hace `applyChartDefaults()`). */
function zoomReady(chart: Chart): boolean {
  return typeof chart.resetZoom === 'function';
}

/** Zoom en pasos fijos, centrado en la vista actual (botones lupa +/−). */
export function stepZoom(chart: Chart, direction: 'in' | 'out'): void {
  if (zoomReady(chart)) chart.zoom(direction === 'in' ? ZOOM_STEP : 1 / ZOOM_STEP);
}

/** Rango visible actual por eje, o `null` si la gráfica está en su vista base. */
export function readZoomBounds(chart: Chart): ChartZoomBounds | null {
  if (!zoomReady(chart)) return null;
  const zoomed = chart.getZoomedScaleBounds();
  const x = zoomed['x'];
  const y = zoomed['y'];
  if (!x && !y) return null;
  const bounds: ChartZoomBounds = {};
  if (x) bounds.x = [x.min, x.max];
  if (y) bounds.y = [y.min, y.max];
  return bounds;
}

/** Re-aplica un rango persistido tras el `reinit()` de `<p-chart>` (sin animación). */
export function applyZoomBounds(chart: Chart, bounds: ChartZoomBounds): void {
  if (!zoomReady(chart)) return;
  if (bounds.x) chart.zoomScale('x', { min: bounds.x[0], max: bounds.x[1] }, 'none' as UpdateMode);
  if (bounds.y) chart.zoomScale('y', { min: bounds.y[0], max: bounds.y[1] }, 'none' as UpdateMode);
}

/**
 * "Restablecer": vuelve al estado inicial EXACTO — zoom, desplazamiento, visibilidad de series
 * (filtros de la leyenda nativa) y modo de interacción — y ejecuta el reset propio del
 * componente (`onReset`, p. ej. `window.reset`).
 */
export function resetView(chart: Chart, state: ChartViewState, onReset?: () => void): void {
  if (zoomReady(chart)) chart.resetZoom('none' as UpdateMode);
  chart.data.datasets.forEach((_, i) => chart.setDatasetVisibility(i, true));
  state.reset();
  onReset?.();
  chart.update('none' as UpdateMode);
}

/** Nivel de zoom actual (1 = base). Para habilitar/deshabilitar los botones de lupa. */
export function readZoomLevel(chart: Chart): number {
  return zoomReady(chart) ? chart.getZoomLevel() : 1;
}
