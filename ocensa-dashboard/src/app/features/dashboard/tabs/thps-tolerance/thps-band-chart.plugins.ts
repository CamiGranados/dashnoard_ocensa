import type { Chart, Plugin } from 'chart.js';

export interface CrosshairSyncOptions {
  groupId: string;
  onHover?: (timestamp: number | null, x: number, y: number) => void;
}

export interface ReferenceLineOptions {
  value: number;
  label: string;
}

const groups = new Map<string, Set<Chart>>();
const hoveredTimestampByGroup = new Map<string, number | null>();

function chartsInGroup(groupId: string): Chart[] {
  return [...(groups.get(groupId) ?? [])];
}

/**
 * Dibuja un crosshair vertical sincronizado entre todas las instancias de Chart.js
 * registradas bajo el mismo groupId. Cada banda es un p-chart independiente (Chart.js
 * no soporta subplots dentro de una sola instancia), así que la sincronización se hace
 * a mano: al mover el mouse sobre cualquiera se guarda el timestamp bajo el cursor y se
 * fuerza un redraw ('none' = sin animación) de las demás para que dibujen la misma línea.
 */
export const crosshairSyncPlugin: Plugin<'line' | 'bar'> = {
  id: 'crosshairSync',

  afterInit(chart, _args, options: CrosshairSyncOptions) {
    if (!options?.groupId) return;
    const set = groups.get(options.groupId) ?? new Set<Chart>();
    set.add(chart);
    groups.set(options.groupId, set);
  },

  afterEvent(chart, args, options: CrosshairSyncOptions) {
    if (!options?.groupId) return;
    const { event, replay } = args;
    if (replay) return;

    if (event.type === 'mousemove') {
      const xScale = chart.scales['x'];
      if (!xScale) return;
      const timestamp = xScale.getValueForPixel(event.x as number) ?? null;
      hoveredTimestampByGroup.set(options.groupId, timestamp);
      // event.x/event.y son relativos al canvas de ESTA banda; para posicionar un tooltip
      // compartido sobre las 4 bandas usamos las coordenadas de viewport del evento nativo.
      const native = event.native as MouseEvent | undefined;
      options.onHover?.(timestamp, native?.clientX ?? 0, native?.clientY ?? 0);
    } else if (event.type === 'mouseout') {
      hoveredTimestampByGroup.set(options.groupId, null);
      options.onHover?.(null, 0, 0);
    } else {
      return;
    }

    for (const sibling of chartsInGroup(options.groupId)) {
      if (sibling !== chart) sibling.update('none');
    }
  },

  afterDatasetsDraw(chart, _args, options: CrosshairSyncOptions) {
    if (!options?.groupId) return;
    const timestamp = hoveredTimestampByGroup.get(options.groupId);
    if (timestamp == null) return;

    const xScale = chart.scales['x'];
    if (!xScale) return;
    const pixel = xScale.getPixelForValue(timestamp);
    if (pixel < chart.chartArea.left || pixel > chart.chartArea.right) return;

    const { top, bottom } = chart.chartArea;
    const { ctx } = chart;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(pixel, top);
    ctx.lineTo(pixel, bottom);
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = 'rgba(15, 27, 46, 0.35)';
    ctx.stroke();
    ctx.restore();
  },

  afterDestroy(chart, _args, options: CrosshairSyncOptions) {
    if (!options?.groupId) return;
    groups.get(options.groupId)?.delete(chart);
  },
};

/** Línea horizontal punteada de referencia (banda Residual, límite contractual 20%). */
export const referenceLinePlugin: Plugin<'line' | 'bar'> = {
  id: 'referenceLine',

  afterDatasetsDraw(chart, _args, options: ReferenceLineOptions) {
    if (!options) return;
    const yScale = chart.scales['y'];
    if (!yScale) return;

    const pixel = yScale.getPixelForValue(options.value);
    const { left, right } = chart.chartArea;
    const { ctx } = chart;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(left, pixel);
    ctx.lineTo(right, pixel);
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 4]);
    ctx.strokeStyle = '#7c3aed';
    ctx.stroke();

    ctx.setLineDash([]);
    ctx.fillStyle = '#7c3aed';
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText(options.label, right, pixel - 4);
    ctx.restore();
  },
};
