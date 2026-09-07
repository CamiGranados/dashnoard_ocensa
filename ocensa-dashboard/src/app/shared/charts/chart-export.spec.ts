import { describe, it, expect } from 'vitest';
import type { Chart } from 'chart.js';

import { chartToCsv, buildChartFileName, matrixToCsv } from './chart-export';

function chartWith(data: Chart['data']): Chart {
  return { data } as Chart;
}

describe('chartToCsv', () => {
  it('series con labels: fila por etiqueta, columna por serie', () => {
    const csv = chartToCsv(
      chartWith({
        labels: ['Nov 25', 'Dic 25', 'Ene 26'],
        datasets: [
          { label: 'Reportada', data: [10, 20, 30] },
          { label: 'Calculada', data: [11, null, 33] },
        ],
      }),
    );
    expect(csv.split('\r\n')).toEqual([
      ',Reportada,Calculada',
      'Nov 25,10,11',
      'Dic 25,20,',
      'Ene 26,30,33',
    ]);
  });

  it('escapa comas y comillas', () => {
    const csv = chartToCsv(
      chartWith({ labels: ['a,b', 'c"d'], datasets: [{ label: 'X, Y', data: [1, 2] }] }),
    );
    expect(csv.split('\r\n')[0]).toBe(',"X, Y"');
    expect(csv.split('\r\n')[1]).toBe('"a,b",1');
    expect(csv.split('\r\n')[2]).toBe('"c""d",2');
  });

  it('series {x,y} sin labels: eje X común ordenado', () => {
    const csv = chartToCsv(
      chartWith({
        datasets: [
          { label: 'A', data: [{ x: 2, y: 20 }, { x: 1, y: 10 }] },
          { label: 'B', data: [{ x: 2, y: 99 }] },
        ],
      }),
    );
    expect(csv.split('\r\n')).toEqual(['x,A,B', '1,10,', '2,20,99']);
  });

  it('nombre de dataset por defecto cuando falta label', () => {
    const csv = chartToCsv(chartWith({ labels: ['x'], datasets: [{ data: [1] }] }));
    expect(csv.split('\r\n')[0]).toBe(',Serie 1');
  });
});

describe('matrixToCsv', () => {
  it('serializa y escapa (CRLF entre filas)', () => {
    expect(matrixToCsv([['Fecha', 'BSR'], ['2026-01-01', 10], ['a,b', null]])).toBe(
      'Fecha,BSR\r\n2026-01-01,10\r\n"a,b",',
    );
  });
});

describe('buildChartFileName', () => {
  it('slug del nombre base + rango de etiquetas', () => {
    const name = buildChartFileName(
      'Desviación FWV',
      chartWith({ labels: ['Nov 25', 'May 26'], datasets: [] }),
    );
    expect(name).toBe('desviacion-fwv-nov-25_may-26');
  });

  it('rango por timestamps cuando las series son {x,y}', () => {
    const jan = new Date('2026-01-15').getTime();
    const mar = new Date('2026-03-20').getTime();
    const name = buildChartFileName(
      'Corrosión',
      chartWith({ datasets: [{ data: [{ x: jan, y: 1 }, { x: mar, y: 2 }] }] }),
    );
    expect(name).toBe('corrosion-2026-01_2026-03');
  });
});
