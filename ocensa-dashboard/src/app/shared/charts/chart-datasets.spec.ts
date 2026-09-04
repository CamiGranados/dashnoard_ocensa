import { describe, it, expect } from 'vitest';

import { lineOrBarDataset } from './chart-datasets';

describe('lineOrBarDataset', () => {
  const base = { label: 'FWV', stroke: '#111', fill: '#222', data: [1, 2, 3] };

  it('línea: valores numéricos unificados (los de corrosion)', () => {
    const ds = lineOrBarDataset({ ...base, type: 'line' });
    expect(ds.borderWidth).toBe(2.3);
    expect(ds.pointRadius).toBe(1);
    expect(ds.pointHoverRadius).toBe(3);
    expect(ds.tension).toBe(0.3);
    expect(ds.borderColor).toBe('#111');
    expect(ds.backgroundColor).toBe('#222');
  });

  it('línea punteada sólo con dashed', () => {
    expect(lineOrBarDataset({ ...base, type: 'line', dashed: true }).borderDash).toEqual([5, 5]);
    expect(lineOrBarDataset({ ...base, type: 'line' }).borderDash).toEqual([]);
    // dashed no aplica a barras
    expect(lineOrBarDataset({ ...base, type: 'bar', dashed: true }).borderDash).toEqual([]);
  });

  it('barra: usa los overrides de barra y no pinta puntos', () => {
    const ds = lineOrBarDataset({
      ...base,
      type: 'bar',
      barThickness: 10,
      barBorderWidth: 1.5,
      barBorderRadius: 2,
    });
    expect(ds.borderWidth).toBe(1.5);
    expect(ds.borderRadius).toBe(2);
    expect(ds.barThickness).toBe(10);
    expect(ds.pointRadius).toBeUndefined();
  });

  it('barra sin overrides: contorno y radio 0', () => {
    const ds = lineOrBarDataset({ ...base, type: 'bar' });
    expect(ds.borderWidth).toBe(0);
    expect(ds.borderRadius).toBe(0);
  });

  it('order se pasa tal cual (undefined si no se da)', () => {
    expect(lineOrBarDataset({ ...base, type: 'bar', order: 999 }).order).toBe(999);
    expect(lineOrBarDataset({ ...base, type: 'line' }).order).toBeUndefined();
  });

  it('devuelve un objeto nuevo cada vez (zoneless)', () => {
    const a = lineOrBarDataset({ ...base, type: 'line' });
    const b = lineOrBarDataset({ ...base, type: 'line' });
    expect(a).not.toBe(b);
  });
});
