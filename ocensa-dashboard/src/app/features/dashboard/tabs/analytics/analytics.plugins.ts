import type { Chart, Plugin } from 'chart.js';

export interface BarValueLabelsOptions {
  /** Formatea el valor mostrado sobre cada barra. `null` la deja sin etiqueta. */
  format: (value: number, index: number) => string;
}

/** Etiqueta con el valor de cada barra, dibujada encima de ella (analytics: THPS promedio por
 *  estado de control — 2 barras, sin espacio para una leyenda de datos aparte). */
export const barValueLabelsPlugin: Plugin<'bar'> = {
  id: 'barValueLabels',

  afterDatasetsDraw(chart: Chart, _args, options: BarValueLabelsOptions) {
    if (!options) return;
    const meta = chart.getDatasetMeta(0);
    const dataset = chart.data.datasets[0] as { data: (number | null)[]; borderColor?: string[] | string };
    if (!meta || !dataset) return;

    const { ctx } = chart;
    ctx.save();
    ctx.font = '700 12px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';

    meta.data.forEach((element, index) => {
      const raw = dataset.data[index];
      if (raw == null) return;
      const color = Array.isArray(dataset.borderColor) ? dataset.borderColor[index] : (dataset.borderColor ?? '#1f3a52');
      ctx.fillStyle = color as string;
      const point = element as unknown as { x: number; y: number };
      ctx.fillText(options.format(raw, index), point.x, point.y - 6);
    });

    ctx.restore();
  },
};
