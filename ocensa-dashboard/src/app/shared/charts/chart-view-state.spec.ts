import { describe, it, expect } from 'vitest';

import { createChartViewState } from './chart-view-state';

describe('createChartViewState', () => {
  it('estado inicial: modo pan, sin zoom, líneas de referencia visibles, no expandido', () => {
    const s = createChartViewState();
    expect(s.mode()).toBe('pan');
    expect(s.zoomBounds()).toBeNull();
    expect(s.zoomLevel()).toBe(1);
    expect(s.refLinesVisible()).toBe(true);
    expect(s.expanded()).toBe(false);
    expect(s.isZoomed()).toBe(false);
  });

  it('canZoomIn / canZoomOut según el nivel de zoom y el tope', () => {
    const s = createChartViewState({ maxZoom: 4 });
    expect(s.canZoomIn()).toBe(true);
    expect(s.canZoomOut()).toBe(false);

    s.zoomLevel.set(4);
    expect(s.canZoomIn()).toBe(false);
    expect(s.canZoomOut()).toBe(true);

    s.zoomLevel.set(2);
    expect(s.canZoomIn()).toBe(true);
    expect(s.canZoomOut()).toBe(true);
  });

  it('isZoomed es true con nivel > 1 o con bounds persistidos', () => {
    const s = createChartViewState();
    s.zoomLevel.set(1.5);
    expect(s.isZoomed()).toBe(true);

    s.zoomLevel.set(1);
    s.zoomBounds.set({ x: [10, 20] });
    expect(s.isZoomed()).toBe(true);
  });

  it('reset() vuelve zoom/pan/modo/líneas al inicio pero NO cierra el expandido', () => {
    const s = createChartViewState();
    s.mode.set('select');
    s.zoomBounds.set({ x: [1, 2] });
    s.zoomLevel.set(3);
    s.refLinesVisible.set(false);
    s.expanded.set(true);

    s.reset();

    expect(s.mode()).toBe('pan');
    expect(s.zoomBounds()).toBeNull();
    expect(s.zoomLevel()).toBe(1);
    expect(s.refLinesVisible()).toBe(true);
    expect(s.expanded()).toBe(true);
  });
});
