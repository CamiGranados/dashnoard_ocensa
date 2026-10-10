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
  /** Color de las líneas del papel cuadriculado del área de trazado. */
  gridColor?: string;
}

/** Paso (px) del papel cuadriculado. */
const GRID_STEP = 12;

/** Distancia (px) al punto rojo para considerarlo "bajo el puntero". */
const HOVER_RADIUS = 8;

/** Outlier actualmente bajo el puntero, por gráfica. */
const hoveredOutlier = new WeakMap<Chart, { index: number }>();

/** Lo consulta el tooltip del boxplot para no solaparse con la etiqueta del outlier. */
export function isOutlierHovered(chart: Chart): boolean {
  return hoveredOutlier.has(chart);
}

/**
 * Anotaciones del boxplot de analytics: banda segura, línea de límite, Máx/Mín/Q2 y etiquetas de
 * outliers. Se dibujan en canvas porque dependen de la escala Y (que está oculta).
 */
export const boxAnnotationsPlugin: Plugin<'boxplot'> = {
  id: 'boxAnnotations',

  /** Papel cuadriculado sólo dentro del área de trazado: los ejes quedan fuera de la cuadrícula. */
  beforeDraw(chart: Chart, _args, options: BoxAnnotationsOptions) {
    if (!options?.gridColor) return;
    const { ctx, chartArea } = chart;
    if (!chartArea) return;
    const { left, right, top, bottom } = chartArea;
    ctx.save();
    ctx.beginPath();
    ctx.rect(left, top, right - left, bottom - top);
    ctx.clip();
    ctx.fillStyle = '#fff';
    ctx.fillRect(left, top, right - left, bottom - top);
    ctx.strokeStyle = options.gridColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = left; x <= right; x += GRID_STEP) {
      ctx.moveTo(Math.round(x) + 0.5, top);
      ctx.lineTo(Math.round(x) + 0.5, bottom);
    }
    for (let y = bottom; y >= top; y -= GRID_STEP) {
      ctx.moveTo(left, Math.round(y) + 0.5);
      ctx.lineTo(right, Math.round(y) + 0.5);
    }
    ctx.stroke();
    ctx.restore();
  },

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
    ctx.fillText(`Mín ${format(stats.min)}`, chartArea.right - 2, chartArea.bottom - 7);

    // Q2 arriba a la izquierda, a la altura de Máx (a la altura de la mediana tapaba el eje Y).
    ctx.textAlign = 'left';
    ctx.fillText(`Q2=${format(stats.median)}`, chartArea.left + 2, 7);

    // Etiqueta del outlier bajo el puntero (sólo al pasar el mouse sobre el punto rojo).
    const hovered = hoveredOutlier.get(chart);
    const element = chart.getDatasetMeta(0).data[options.groupIndex] as unknown as { x: number } | undefined;
    if (hovered && element) {
      const o = options.outliers[hovered.index];
      if (o) {
        const oy = px(o.value);
        const padX = 5;
        const w = ctx.measureText(o.text).width + padX * 2;
        const h = 16;
        const flip = element.x + 9 + w > chart.width;
        const bx = flip ? element.x - 9 - w : element.x + 9;
        const by = Math.min(Math.max(oy - h / 2, 0), chart.height - h);
        ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
        ctx.fillRect(bx, by, w, h);
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'left';
        ctx.fillText(o.text, bx + padX, by + h / 2);
      }
    }

    ctx.restore();
  },

  afterEvent(chart: Chart, args, options: BoxAnnotationsOptions) {
    const e = args.event;
    let index = -1;
    if (options?.outliers?.length && e.x != null && e.y != null && e.type !== 'mouseout') {
      const element = chart.getDatasetMeta(0).data[options.groupIndex] as unknown as
        | { x: number }
        | undefined;
      const y = chart.scales['y'];
      if (element && y) {
        let best = HOVER_RADIUS;
        options.outliers.forEach((o, i) => {
          const d = Math.hypot(e.x! - element.x, e.y! - y.getPixelForValue(o.value));
          if (d <= best) {
            best = d;
            index = i;
          }
        });
      }
    }
    const prev = hoveredOutlier.get(chart)?.index ?? -1;
    if (index === prev) return;
    if (index < 0) hoveredOutlier.delete(chart);
    else hoveredOutlier.set(chart, { index });
    args.changed = true;
  },
};
