// microbiology-timeline.transform.ts
// Funciones puras (sin Angular) que preparan MicroRecordDto[] para la gráfica de serie
// temporal: parseo de fecha, filtro de categoría graficable y deduplicación.

import { MicroRecordDto } from '../../../../core/models/microbiology.model';

// El backend ya entrega standardSamplingType normalizado. Solo Prebache/Postbache se
// grafican: Seguimiento, "No disponible por OPS" y cualquier otro valor se excluyen.
export type SamplingCategory = 'Prebache' | 'Postbache';

export interface TimelinePoint {
  timestamp: number;
  date: Date;
  category: SamplingCategory;
  thpsPercent: number | null;
  bsrPlanct: number | null;
  bpaPlanct: number | null;
  bhtPlanct: number | null;
  bAntPlanct: number | null;
}

const VALUE_KEYS = ['thpsPercent', 'bsrPlanct', 'bpaPlanct', 'bhtPlanct', 'bAntPlanct'] as const;

const PLOTTABLE_CATEGORIES: ReadonlySet<string> = new Set(['Prebache', 'Postbache']);

function toPlottableCategory(raw: string): SamplingCategory | null {
  const trimmed = (raw ?? '').trim();
  return PLOTTABLE_CATEGORIES.has(trimmed) ? (trimmed as SamplingCategory) : null;
}

/**
 * Parsea explícitamente el formato 'd/M/yyyy' (ej. '3/8/2024' = 3 ago 2024).
 * new Date(string) se evita a propósito: en algunos motores JS interpreta 'd/M/yyyy'
 * como 'M/d/yyyy' (mes/día en vez de día/mes), lo que corrompería fechas como 3/8.
 */
export function parseDMYDate(raw: string): Date | null {
  if (!raw) return null;
  const parts = raw.trim().split('/');
  if (parts.length !== 3) return null;

  const [d, m, y] = parts.map((p) => Number(p));
  if (!Number.isInteger(d) || !Number.isInteger(m) || !Number.isInteger(y)) return null;
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;

  const date = new Date(y, m - 1, d);
  // Descarta desbordes silenciosos de Date (ej. 31/2/2024 -> 2 mar 2024).
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;

  return date;
}

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}/;

/**
 * MicroRecordDto documenta fechas ISO ('2026-05-23T00:00:00'), pero en la práctica el backend
 * también puede entregar 'd/M/yyyy' según el origen del dato. Se detecta el formato por la
 * presencia de '/': si lo tiene, se usa el parser explícito (evita la ambigüedad d/M vs M/d);
 * si no, se asume ISO 8601, donde new Date(string) sí es seguro por no ser ambiguo.
 */
function parseRecordDate(raw: string): Date | null {
  if (!raw) return null;
  if (raw.includes('/')) return parseDMYDate(raw);
  if (!ISO_DATE_REGEX.test(raw)) return null;

  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** log10 con log10(0) := 0 (nunca -Infinity); null/NaN se propagan como null (se omiten al graficar). */
export function toLog10(v: number | null | undefined): number | null {
  if (v == null || Number.isNaN(v)) return null;
  return v > 0 ? Math.log10(v) : 0;
}

function sameValues(a: MicroRecordDto, b: MicroRecordDto): boolean {
  return VALUE_KEYS.every((key) => a[key] === b[key]);
}

function toPoint(record: MicroRecordDto, category: SamplingCategory, date: Date): TimelinePoint {
  return {
    timestamp: date.getTime(),
    date,
    category,
    thpsPercent: record.thpsPercent,
    bsrPlanct: record.bsrPlanct,
    bpaPlanct: record.bpaPlanct,
    bhtPlanct: record.bhtPlanct,
    bAntPlanct: record.bAntPlanct,
  };
}

interface GroupEntry {
  record: MicroRecordDto;
  category: SamplingCategory;
  date: Date;
  order: number;
}

/**
 * Filtra a solo Prebache/Postbache, parsea la fecha, deduplica (fecha + categoría + misma
 * tupla de valores -> 1 registro) y ordena ascendente por fecha. Si dentro del mismo grupo
 * hay valores distintos, no se colapsan: se conservan todos y se deja un warning.
 */
export function buildTimelinePoints(records: MicroRecordDto[]): TimelinePoint[] {
  const groups = new Map<string, GroupEntry[]>();
  const unparsed: string[] = [];

  records.forEach((record, order) => {
    const category = toPlottableCategory(record.standardSamplingType);
    if (!category) return; // Seguimiento, "No disponible por OPS", etc.: no se grafican

    const date = parseRecordDate(record.date);
    if (!date) {
      unparsed.push(record.date);
      return;
    }

    const key = `${date.getTime()}|${category}`;
    const entries = groups.get(key) ?? [];
    entries.push({ record, category, date, order });
    groups.set(key, entries);
  });

  const points: TimelinePoint[] = [];

  for (const entries of groups.values()) {
    const [first] = entries;
    const allSame = entries.every((e) => sameValues(e.record, first.record));

    if (allSame) {
      const [chosen] = entries.slice().sort((a, b) => a.order - b.order);
      points.push(toPoint(chosen.record, chosen.category, chosen.date));
    } else {
      console.warn(
        `[microbiology-timeline] valores distintos para la misma fecha/categoría (${first.date.toDateString()} / ${first.category}); se conservan todos los registros sin deduplicar`,
      );
      entries.forEach((e) => points.push(toPoint(e.record, e.category, e.date)));
    }
  }

  if (unparsed.length) {
    console.warn(
      `[microbiology-timeline] ${unparsed.length} registro(s) con fecha no reconocida (ni d/M/yyyy ni ISO 8601), se omiten de la gráfica:`,
      unparsed.slice(0, 5),
    );
  }

  return points.sort((a, b) => a.timestamp - b.timestamp);
}
