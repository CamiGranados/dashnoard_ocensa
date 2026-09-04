/**
 * Utilidades de fecha compartidas por las gráficas del dashboard.
 *
 * Regla: NUNCA parsear una fecha ISO fecha-sola con `new Date('2025-08-05')` — se
 * interpreta como medianoche UTC y en Colombia (UTC-5) `getDate()` devuelve el día
 * anterior. Para leer los componentes de una fecha del backend se usa `dateParts()`
 * (slice del string); para el eje X numérico, `isoToLocalTimestamp()` construye con
 * `new Date(y, m-1, d)`.
 */

/** Meses en español, abreviados y con inicial mayúscula. Fuente única del proyecto. */
export const MESES = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
] as const;

/**
 * Extrae [año, mes(1-12), día] de una fecha ISO ('2025-08-05' o
 * '2025-08-05T00:00:00') leyendo el string directamente: `new Date('2025-08-05')`
 * se interpreta como UTC y en Colombia (UTC-5) devolvería el día anterior con
 * `getDate()`. El `new Date(d)` de respaldo sólo corre si el string no trae el
 * formato esperado.
 */
export function dateParts(d: string): [number, number, number] {
  const parts = (d ?? '').slice(0, 10).split('-').map(Number);
  if (parts.length === 3 && parts.every(Number.isFinite)) {
    return [parts[0], parts[1], parts[2]];
  }
  const dt = new Date(d);
  return [dt.getFullYear(), dt.getMonth() + 1, dt.getDate()];
}

/**
 * Timestamp (epoch ms) en hora LOCAL para una fecha ISO fecha-sola. Construye con
 * `new Date(y, m-1, d)` para no perder el día por el desfase UTC. Pensado para el
 * eje X numérico de las gráficas de tiempo.
 *
 * Nota: pendiente de cablear en thps-tolerance/physicochemistry hasta confirmar el
 * formato real del campo `date` del backend (ver plan del refactor de gráficas).
 */
export function isoToLocalTimestamp(d: string): number {
  const [y, m, day] = dateParts(d);
  return new Date(y, m - 1, day).getTime();
}

/** 'Ago 2025' — mes abreviado + año de 4 dígitos, sin día. */
export function formatMonthYear(d: string): string {
  const [y, m] = dateParts(d);
  return `${MESES[m - 1]} ${y}`;
}

/** '5 Ago 2025' — día + mes abreviado + año de 4 dígitos. Para tooltips. */
export function formatFullDate(d: string): string {
  const [y, m, day] = dateParts(d);
  return `${day} ${MESES[m - 1]} ${y}`;
}
