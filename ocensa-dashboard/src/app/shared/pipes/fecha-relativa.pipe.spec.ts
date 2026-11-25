import { describe, it, expect } from 'vitest';

import { FechaRelativaPipe, diasNaturalesEntre, etiquetaDia } from './fecha-relativa.pipe';

describe('FechaRelativaPipe', () => {
  const pipe = new FechaRelativaPipe();
  // Miércoles 25 nov 2026, 11:45 (hora local).
  const ahora = new Date(2026, 10, 25, 11, 45);

  it('hoy: "Hoy, hh:mm AM/PM"', () => {
    expect(pipe.transform(new Date(2026, 10, 25, 10, 24), ahora)).toBe('Hoy, 10:24 AM');
    expect(pipe.transform(new Date(2026, 10, 25, 0, 5), ahora)).toBe('Hoy, 12:05 AM');
  });

  it('ayer: "Ayer, hh:mm PM" aunque hayan pasado menos de 24 h', () => {
    expect(pipe.transform(new Date(2026, 10, 24, 16, 30), ahora)).toBe('Ayer, 04:30 PM');
    expect(pipe.transform(new Date(2026, 10, 24, 23, 59), ahora)).toBe('Ayer, 11:59 PM');
  });

  it('2 a 6 días: "Hace N días"', () => {
    expect(pipe.transform(new Date(2026, 10, 23, 8, 0), ahora)).toBe('Hace 2 días');
    expect(pipe.transform(new Date(2026, 10, 19, 8, 0), ahora)).toBe('Hace 6 días');
  });

  it('7 días o más: fecha corta', () => {
    expect(pipe.transform(new Date(2026, 10, 18, 8, 0), ahora)).toBe('18 Nov 2026');
  });

  it('ISO sólo-fecha se lee en hora local (no cae al día anterior)', () => {
    expect(pipe.transform('2026-11-24', ahora)).toBe('Ayer, 12:00 AM');
  });

  it('vacío o inválido: "—"', () => {
    expect(pipe.transform(null, ahora)).toBe('—');
    expect(pipe.transform('', ahora)).toBe('—');
    expect(pipe.transform('no-es-fecha', ahora)).toBe('—');
  });
});

describe('diasNaturalesEntre / etiquetaDia', () => {
  const ahora = new Date(2026, 10, 25, 0, 10);

  it('cuenta días de calendario, no bloques de 24 h', () => {
    expect(diasNaturalesEntre(new Date(2026, 10, 24, 23, 50), ahora)).toBe(1);
    expect(etiquetaDia(new Date(2026, 10, 25, 0, 1), ahora)).toBe('Hoy');
  });

  it('cruza fin de mes', () => {
    expect(etiquetaDia(new Date(2026, 9, 31, 12, 0), new Date(2026, 10, 2, 9, 0))).toBe(
      'Hace 2 días',
    );
  });
});
