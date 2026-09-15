import { SeriesChartType } from './series-toggles';

export interface LineOrBarDatasetOptions {
  label: string;
  type: SeriesChartType;
  /** Color de trazo (borderColor). Para líneas es también el color implícito del punto. */
  stroke: string;
  /** Relleno (backgroundColor). Para líneas normalmente === stroke; para barras, relleno claro. */
  fill: string;
  /** Puntos ya mapeados por el llamador (`number[]` o `{x,y}[]`). */
  data: unknown;
  yAxisID?: string;
  /** Línea punteada. Sólo aplica a `type: 'line'`. */
  dashed?: boolean;
  /** `order` de Chart.js (mayor = se dibuja detrás y va después en la leyenda). */
  order?: number;
  /** Ancho fijo de barra en px. Con varias barras agrupadas en el mismo punto X, este es el
   *  ancho del "carril" reservado por barra (determina la posición), no necesariamente lo
   *  que se pinta — ver `maxBarThickness`. */
  barThickness?: number;
  /** Ancho MÁXIMO pintado de la barra, en px. Con `barThickness` fijo, Chart.js no deja hueco
   *  propio entre barras agrupadas del mismo punto X (el "carril" se pinta completo); si es
   *  menor que `barThickness`, la barra queda centrada en su carril y el sobrante se ve como
   *  separación entre barras contiguas. Opcional: por defecto pinta el carril completo. */
  maxBarThickness?: number;
  /** Grosor del contorno de la barra (líneas usan un valor fijo). */
  barBorderWidth?: number;
  /** Radio de esquina de la barra. */
  barBorderRadius?: number;
}

/**
 * Dataset Chart.js de línea o barra con los parámetros numéricos unificados (valores
 * de corrosion: `borderWidth` 2.3, `pointRadius` 1, `pointHoverRadius` 3, `tension`
 * 0.3). Extraído de `thps.buildLinearDataset` y del `.map()` inline de `corrosion`.
 * Devuelve SIEMPRE un objeto nuevo (zoneless: mutar in-place no redibuja).
 *
 * `physicochemistry` NO usa este helper: sus series "media" llevan relleno de área y
 * marcadores de círculo hueco propios.
 */
export function lineOrBarDataset(opts: LineOrBarDatasetOptions) {
  const isBar = opts.type === 'bar';
  return {
    type: opts.type,
    label: opts.label,
    borderColor: opts.stroke,
    backgroundColor: opts.fill,
    yAxisID: opts.yAxisID ?? 'y',
    spanGaps: true,
    tension: 0.3,
    borderWidth: isBar ? (opts.barBorderWidth ?? 0) : 2.3,
    borderDash: !isBar && opts.dashed ? [5, 5] : [],
    borderSkipped: isBar ? false : undefined,
    borderRadius: isBar ? (opts.barBorderRadius ?? 0) : undefined,
    pointRadius: isBar ? undefined : 1,
    pointHoverRadius: isBar ? undefined : 3,
    barThickness: isBar ? opts.barThickness : undefined,
    maxBarThickness: isBar ? opts.maxBarThickness : undefined,
    order: opts.order,
    data: opts.data,
  };
}
