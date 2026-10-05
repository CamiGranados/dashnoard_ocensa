import type { Chart, Plugin } from 'chart.js';
import { BoxplotStats } from '../boxplot-stats';

export interface BoxOutlierLabel {
  value: number;
  /** Texto ya formateado junto al punto (valor y, si hay, fecha). */
  text: string;
}

export interface BoxAnnotationsOptions {
  /** Índice de categoría (0 = Controlado, 1 = No controlado) al que apuntan las anotaciones. */
  groupIndex: number;
  stats: BoxplotStats | null;
  format: (n: number) => string;
  font: string;
  textColor: string;
  outlierColor: string;
  limitColor: string;
  bandColor: string;
  outliers: BoxOutlierLabel[];
  /** Banda de referencia (rango seguro). */
  band: { min: number; max: number } | null;
  /** Umbral/límite: línea horizontal discontinua. */
  limit: number | null;
}

/**
 * Anotaciones del boxplot de analytics: banda segura, línea de límite, Máx/Mín/Q2 y etiquetas de
 * outliers. Se dibujan en canvas porque dependen de la escala Y (que está oculta).
 */
export const boxAnnotationsPlugin: Plugin<'boxplot'> = {
  id: 'boxAnnotations',

  beforeDatasetsDraw(chart: Chart, _args, options: BoxAnnotationsOptions) {
    if (!options?.band) return;
    const { ctx, chartArea, scales } = chart;
    const y = scales['y'];
    if (!y) return;
    const top = Math.max(chartArea.top, y.getPixelForValue(options.band.max));
    const bottom = Math.min(chartArea.bottom, y.getPixelForValue(options.band.min));
    if (bottom <= top) return;
    ctx.save();
    ctx.fillStyle = options.bandColor;
    ctx.fillRect(chartArea.left, top, chartArea.right - chartArea.left, bottom - top);
    ctx.restore();
  },

  afterDatasetsDraw(chart: Chart, _args, options: BoxAnnotationsOptions) {
    if (!options?.stats) return;
    const { ctx, chartArea, scales } = chart;
    const y = scales['y'];
    if (!y) return;
    const { stats, format } = options;
    const px = (v: number) => y.getPixelForValue(v);

    ctx.save();
    ctx.font = options.font;
    ctx.textBaseline = 'middle';

    // Límite: línea discontinua + etiqueta arriba a la derecha.
    if (options.limit != null) {
      const ly = px(options.limit);
      if (ly >= chartArea.top && ly <= chartArea.bottom) {
        ctx.save();
        ctx.strokeStyle = options.limitColor;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(chartArea.left, ly);
        ctx.lineTo(chartArea.right, ly);
        ctx.stroke();
        ctx.restore();
        ctx.fillStyle = options.limitColor;
        ctx.textAlign = 'right';
        ctx.fillText(`${format(options.limit)} Límite`, chartArea.right - 2, ly - (ly - 8 < chartArea.top ? -8 : 8));
      }
    }

    // Esquina superior derecha: Outlier (si hay uno por encima de la mediana) o Máx.
    const upperOutliers = stats.outliers.filter((v) => v > stats.median);
    ctx.textAlign = 'right';
    if (upperOutliers.length) {
      ctx.fillStyle = options.outlierColor;
      ctx.fillText(`Outlier ${format(Math.max(...upperOutliers))}`, chart.width - 2, 7);
    } else {
      ctx.fillStyle = options.textColor;
      ctx.fillText(`Máx ${format(stats.max)}`, chart.width - 2, 7);
    }
    ctx.fillStyle = options.textColor;
    ctx.fillText(`Mín ${format(stats.min)}`, chart.width - 2, chart.height - 7);

    // Q2 a la izquierda, a la altura de la mediana.
    ctx.textAlign = 'left';
    ctx.fillText(`Q2=${format(stats.median)}`, 2, px(stats.median));

    // Etiquetas de outliers junto a su punto.
    const element = chart.getDatasetMeta(0).data[options.groupIndex] as unknown as { x: number } | undefined;
    if (element) {
      ctx.fillStyle = options.outlierColor;
      for (const o of options.outliers) {
        const oy = px(o.value);
        const width = ctx.measureText(o.text).width;
        const flip = element.x + 7 + width > chart.width;
        ctx.textAlign = flip ? 'right' : 'left';
        ctx.fillText(o.text, element.x + (flip ? -7 : 7), oy);
      }
    }

    ctx.restore();
  },
};
