import type { Chart } from 'chart.js';

/**
 * Bandera "ocultar líneas de referencia" por instancia de Chart.js, para la herramienta
 * "mostrar/ocultar líneas de referencia" de la barra (`<app-chart-toolbar>`).
 *
 * Las líneas de referencia (tolerancia, límites, 20 % contractual…) las dibujan plugins
 * locales de cada gráfica en `afterDatasetsDraw` (`toleranceLinePlugin`, `referenceLinePlugin`,
 * `limitLinesPlugin`). Cada uno de esos plugins consulta `refLinesHidden(chart)` al entrar y
 * hace `return` si está activa. El estado vive fuera del `data`/`options` para sobrevivir al
 * `reinit()` que hace `<p-chart>` en cada cambio de entrada; se re-aplica desde `ChartFrame`.
 */
const hiddenByChart = new WeakMap<Chart, boolean>();

/** `true` si el usuario ocultó las líneas de referencia de esta gráfica. */
export function refLinesHidden(chart: Chart): boolean {
  return hiddenByChart.get(chart) === true;
}

/** Marca/desmarca la gráfica como "sin líneas de referencia". No redibuja: hazlo tú con `chart.update()`. */
export function setRefLinesHidden(chart: Chart, hidden: boolean): void {
  hiddenByChart.set(chart, hidden);
}
