import type { Plugin } from 'chart.js';
import { refLinesHidden } from '../../../shared/charts/chart-reference-lines';

export interface ToleranceLineOptions {
  /** Valor sobre el eje `y` donde se dibuja la línea. */
  value: number;
  /** Etiqueta alineada a la derecha, justo encima de la línea. */
  label: string;
  /** Color ya resuelto (hex/rgb), normalmente vía chartToken(). */
  color: string;
}

/**
 * Línea horizontal punteada de tolerancia contractual sobre el eje `y`, con la
 * etiqueta alineada a la derecha (estilo de la vista ejecutiva de FWV). Local a
 * overview: el color entra por opciones (token de dominio), a diferencia de
 * referenceLinePlugin / limitLinesPlugin que fijan su hex.
 */
export const toleranceLinePlugin: Plugin<'bar'> = {
  id: 'toleranceLine',

  afterDatasetsDraw(chart, _args, options: ToleranceLineOptions) {
    if (!options || refLinesHidden(chart)) return;
    const yScale = chart.scales['y'];
    if (!yScale) return;

    const pixel = yScale.getPixelForValue(options.value);
    const { left, right, top, bottom } = chart.chartArea;
    if (pixel < top || pixel > bottom) return;

    const { ctx } = chart;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(left, pixel);
    ctx.lineTo(right, pixel);
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 4]);
    ctx.strokeStyle = options.color;
    ctx.stroke();

    ctx.setLineDash([]);
    ctx.fillStyle = options.color;
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText(options.label, right, pixel - 4);
    ctx.restore();
  },
};
