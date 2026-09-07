import { describe, it, expect } from 'vitest';
import type { Chart } from 'chart.js';

import { refLinesHidden, setRefLinesHidden } from './chart-reference-lines';

// El módulo sólo usa la instancia como clave de un WeakMap: un objeto vacío basta.
function fakeChart(): Chart {
  return {} as Chart;
}

describe('chart-reference-lines', () => {
  it('por defecto las líneas de referencia NO están ocultas', () => {
    expect(refLinesHidden(fakeChart())).toBe(false);
  });

  it('setRefLinesHidden alterna el estado por instancia', () => {
    const a = fakeChart();
    const b = fakeChart();

    setRefLinesHidden(a, true);
    expect(refLinesHidden(a)).toBe(true);
    expect(refLinesHidden(b)).toBe(false);

    setRefLinesHidden(a, false);
    expect(refLinesHidden(a)).toBe(false);
  });
});
