import { describe, it, expect } from 'vitest';

import { dateParts, isoToLocalTimestamp, formatMonthYear, formatFullDate, MESES } from './chart-dates';

describe('dateParts', () => {
  it('lee [año, mes, día] de una fecha ISO fecha-sola sin pasar por new Date()', () => {
    expect(dateParts('2025-08-05')).toEqual([2025, 8, 5]);
  });

  it('ignora el componente horario', () => {
    expect(dateParts('2025-08-05T00:00:00')).toEqual([2025, 8, 5]);
    expect(dateParts('2026-01-01T23:59:59')).toEqual([2026, 1, 1]);
  });

  it('cae al fallback new Date() sólo si el formato no es el esperado', () => {
    const [y] = dateParts('05/08/2025');
    expect(Number.isFinite(y)).toBe(true);
  });
});

describe('isoToLocalTimestamp', () => {
  it('construye el timestamp en hora local: getDate() devuelve el mismo día', () => {
    const ts = isoToLocalTimestamp('2025-08-05');
    const d = new Date(ts);
    expect(d.getFullYear()).toBe(2025);
    expect(d.getMonth()).toBe(7); // agosto (0-index)
    expect(d.getDate()).toBe(5);
  });
});

describe('formatters', () => {
  it('formatMonthYear -> "Mes AAAA"', () => {
    expect(formatMonthYear('2025-08-05')).toBe('Ago 2025');
  });

  it('formatFullDate -> "D Mes AAAA"', () => {
    expect(formatFullDate('2025-08-05T00:00:00')).toBe('5 Ago 2025');
  });

  it('MESES tiene 12 entradas en orden', () => {
    expect(MESES).toHaveLength(12);
    expect(MESES[0]).toBe('Ene');
    expect(MESES[11]).toBe('Dic');
  });
});
