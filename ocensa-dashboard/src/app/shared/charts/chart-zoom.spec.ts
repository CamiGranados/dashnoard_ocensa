import { describe, it, expect, vi } from 'vitest';
import type { Chart } from 'chart.js';

import { buildZoomOptions, stepZoom, resetView, readZoomBounds } from './chart-zoom';
import { createChartViewState } from './chart-view-state';

describe('buildZoomOptions', () => {
  it('modo pan: arrastrar mueve, no dibuja rectángulo', () => {
    const o = buildZoomOptions({ mode: 'pan' });
    expect(o.pan?.enabled).toBe(true);
    expect(o.zoom?.drag?.enabled).toBe(false);
    expect(o.zoom?.mode).toBe('x');
    expect(o.pan?.mode).toBe('x');
  });

  it('modo select: arrastrar dibuja rectángulo, no mueve', () => {
    const o = buildZoomOptions({ mode: 'select' });
    expect(o.pan?.enabled).toBe(false);
    expect(o.zoom?.drag?.enabled).toBe(true);
    expect(o.zoom?.drag).toMatchObject({ borderWidth: 1 });
  });

  it('axisMode se propaga a zoom y pan', () => {
    const o = buildZoomOptions({ mode: 'pan', axisMode: 'xy' });
    expect(o.zoom?.mode).toBe('xy');
    expect(o.pan?.mode).toBe('xy');
  });

  it('rueda: sólo con Ctrl, y se puede desactivar', () => {
    expect(buildZoomOptions({ mode: 'pan' }).zoom?.wheel).toMatchObject({
      enabled: true,
      modifierKey: 'ctrl',
    });
    expect(buildZoomOptions({ mode: 'pan', wheel: false }).zoom?.wheel?.enabled).toBe(false);
  });

  it('limita el zoom/pan a los datos originales', () => {
    const o = buildZoomOptions({ mode: 'pan' });
    expect(o.limits?.['x']).toEqual({ min: 'original', max: 'original' });
  });
});

describe('stepZoom', () => {
  it('acerca con factor > 1 y aleja con factor < 1', () => {
    const zoom = vi.fn();
    const chart = { zoom, resetZoom: () => {} } as unknown as Chart;

    stepZoom(chart, 'in');
    stepZoom(chart, 'out');

    expect(zoom.mock.calls[0][0]).toBeGreaterThan(1);
    expect(zoom.mock.calls[1][0]).toBeLessThan(1);
    // in y out son inversos
    expect(zoom.mock.calls[0][0] * zoom.mock.calls[1][0]).toBeCloseTo(1);
  });
});

describe('readZoomBounds', () => {
  it('null si la gráfica está en su vista base', () => {
    const chart = { resetZoom: () => {}, getZoomedScaleBounds: () => ({}) } as unknown as Chart;
    expect(readZoomBounds(chart)).toBeNull();
  });

  it('devuelve el rango por eje presente', () => {
    const chart = {
      resetZoom: () => {},
      getZoomedScaleBounds: () => ({ x: { min: 5, max: 9 } }),
    } as unknown as Chart;
    expect(readZoomBounds(chart)).toEqual({ x: [5, 9] });
  });

  it('null si el plugin de zoom no está registrado', () => {
    expect(readZoomBounds({ getZoomedScaleBounds: () => ({}) } as unknown as Chart)).toBeNull();
  });
});

describe('resetView', () => {
  it('resetea zoom, visibilidad de series, estado y ejecuta onReset', () => {
    const resetZoom = vi.fn();
    const setDatasetVisibility = vi.fn();
    const update = vi.fn();
    const chart = {
      resetZoom,
      setDatasetVisibility,
      update,
      data: { datasets: [{}, {}] },
    } as unknown as Chart;
    const state = createChartViewState();
    state.mode.set('select');
    state.zoomLevel.set(3);
    const onReset = vi.fn();

    resetView(chart, state, onReset);

    expect(resetZoom).toHaveBeenCalled();
    expect(setDatasetVisibility).toHaveBeenCalledTimes(2);
    expect(setDatasetVisibility).toHaveBeenCalledWith(0, true);
    expect(state.mode()).toBe('pan');
    expect(state.zoomLevel()).toBe(1);
    expect(onReset).toHaveBeenCalledOnce();
    expect(update).toHaveBeenCalled();
  });
});
