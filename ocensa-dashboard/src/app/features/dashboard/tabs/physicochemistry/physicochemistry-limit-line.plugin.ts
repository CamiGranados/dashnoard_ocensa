import type { Plugin } from 'chart.js';

export interface LimitLinesOptions {
  min: number;
  max: number;
}

/** Dibuja dos líneas horizontales punteadas (mín/máx) que marcan el rango aceptable de la variable. */
export const limitLinesPlugin: Plugin<'line' | 'bar'> = {
  id: 'limitLines',

  afterDatasetsDraw(chart, _args, options: LimitLinesOptions) {
    if (!options) return;
    const yScale = chart.scales['y'];
    if (!yScale) return;

    const { left, right, top, bottom } = chart.chartArea;
    const { ctx } = chart;

    const drawLine = (value: number) => {
      const pixel = yScale.getPixelForValue(value);
      if (pixel < top || pixel > bottom) return;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(left, pixel);
      ctx.lineTo(right, pixel);
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 6]);
      ctx.strokeStyle = '#84cc16';
      ctx.stroke();
      ctx.restore();
    };

    drawLine(options.min);
    drawLine(options.max);
  },
};
