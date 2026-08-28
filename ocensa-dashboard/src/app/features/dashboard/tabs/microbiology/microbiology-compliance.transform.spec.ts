import { describe, it, expect } from 'vitest';

import { buildComplianceGrid } from './microbiology-compliance.transform';
import type { TimelinePoint } from './microbiology-timeline.transform';
import type { MonthlyControlDto } from '../../../../core/models/microbiology.model';

function point(
  dateIso: string,
  values: Partial<Omit<TimelinePoint, 'timestamp' | 'date' | 'category'>>,
): TimelinePoint {
  const date = new Date(dateIso);
  return {
    timestamp: date.getTime(),
    date,
    category: 'Seguimiento',
    thpsPercent: null,
    bsrPlanct: null,
    bpaPlanct: null,
    bhtPlanct: null,
    bAntPlanct: null,
    ...values,
  };
}

const NOW = new Date('2026-08-15');

describe('buildComplianceGrid', () => {
  it('devuelve grid vacío sin puntos', () => {
    expect(buildComplianceGrid([], [], NOW)).toEqual({ months: [], rows: [] });
  });

  it('cuenta mediciones tomadas (Y) y las que quedan <= 10^2 (X) por mes', () => {
    const points = [
      point('2026-03-05', { bsrPlanct: 10 }), // dentro
      point('2026-03-12', { bsrPlanct: 100 }), // dentro (igual al umbral)
      point('2026-03-20', { bsrPlanct: 5000 }), // fuera
      point('2026-03-25', { bsrPlanct: null }), // sin dato -> no cuenta
    ];

    const grid = buildComplianceGrid(points, [], NOW);
    const bsrMarch = grid.rows.find((r) => r.key === 'bsrPlanct')!.cells[0];

    expect(bsrMarch.taken).toBe(3);
    expect(bsrMarch.withinLimit).toBe(2);
    expect(bsrMarch.outOfLimit).toBe(1);
    expect(bsrMarch.label).toBe('2/3');
    expect(bsrMarch.status).toBe('warn');
  });

  it('rango de meses: primer dato -> mes en curso, con huecos "sin muestreo"', () => {
    const grid = buildComplianceGrid([point('2026-06-10', { bpaPlanct: 1 })], [], NOW);

    expect(grid.months.map((m) => m.label)).toEqual(['jun/26', 'jul/26', 'ago/26']);
    expect(grid.months[2].isCurrent).toBe(true);

    const bpa = grid.rows.find((r) => r.key === 'bpaPlanct')!;
    expect(bpa.cells[1].status).toBe('none'); // julio sin muestreo
    expect(bpa.cells[1].label).toBe('·');
  });

  it('el mes en curso siempre queda en estado "current" aunque haya valores fuera de límite', () => {
    const grid = buildComplianceGrid([point('2026-08-02', { bhtPlanct: 9999 })], [], NOW);
    const bhtAug = grid.rows.find((r) => r.key === 'bhtPlanct')!.cells.at(-1)!;

    expect(bhtAug.status).toBe('current');
    expect(bhtAug.label).toBe('0/1');
  });

  it('status "ok" cuando todas las mediciones están dentro de límite', () => {
    const grid = buildComplianceGrid(
      [point('2026-01-10', { bAntPlanct: 0 }), point('2026-01-20', { bAntPlanct: 50 })],
      [],
      NOW,
    );
    expect(grid.rows.find((r) => r.key === 'bAntPlanct')!.cells[0].status).toBe('ok');
  });

  it('status "bad" con 2 o más fuera de límite', () => {
    const grid = buildComplianceGrid(
      [point('2026-02-10', { bsrPlanct: 500 }), point('2026-02-20', { bsrPlanct: 800 })],
      [],
      NOW,
    );
    expect(grid.rows.find((r) => r.key === 'bsrPlanct')!.cells[0].status).toBe('bad');
  });

  it('arrastra el % de cumplimiento del backend (monthlyControl) a la celda del mes/variable', () => {
    const monthlyControl: MonthlyControlDto[] = [
      {
        year: 2026,
        month: 3,
        bsrControlPercent: 67,
        bpaControlPercent: null,
        bhtControlPercent: 100,
        bAntControlPercent: 50,
      },
    ];
    const grid = buildComplianceGrid([point('2026-03-05', { bsrPlanct: 10 })], monthlyControl, NOW);

    const bsrMarch = grid.rows.find((r) => r.key === 'bsrPlanct')!.cells[0];
    const bhtMarch = grid.rows.find((r) => r.key === 'bhtPlanct')!.cells[0];

    expect(bsrMarch.controlPercent).toBe(67);
    expect(bhtMarch.controlPercent).toBe(100);
    // Mes sin fila en monthlyControl -> null.
    expect(grid.rows.find((r) => r.key === 'bsrPlanct')!.cells.at(-1)!.controlPercent).toBeNull();
  });
});
