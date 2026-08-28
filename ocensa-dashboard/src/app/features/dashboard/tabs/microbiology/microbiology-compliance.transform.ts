// microbiology-compliance.transform.ts
// Función pura (sin Angular) que arma el grid de cumplimiento mensual: una fila por variable
// (BSR/BPA/BHT/BAnT) y una columna por mes (primer mes con muestra → mes en curso). Cada celda
// cuenta cuántas mediciones se tomaron ese mes y cuántas quedaron en o por debajo de 10² UFC/mL,
// y arrastra el % de cumplimiento que ya calcula el backend (`monthlyControl`) para el tooltip.
// Se alimenta de los TimelinePoint (solo Prebache/Postbache/Seguimiento, ya deduplicados).

import { TimelinePoint } from './microbiology-timeline.transform';
import type { MicroVariableKey } from './microbiology-bache.transform';
import type { MonthlyControlDto } from '../../../../core/models/microbiology.model';

// 10² UFC/mL: una muestra con recuento <= 100 está "dentro de límite" (mismo umbral que la
// línea de control log10 = 2 de la gráfica de baches).
export const COMPLIANCE_THRESHOLD = 100;

export type ComplianceStatus = 'ok' | 'warn' | 'bad' | 'none' | 'current';

const MESES_ABREV = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
];

const VARIABLE_ROWS: { key: MicroVariableKey; label: string }[] = [
  { key: 'bsrPlanct', label: 'BSR' },
  { key: 'bpaPlanct', label: 'BPA' },
  { key: 'bhtPlanct', label: 'BHT' },
  { key: 'bAntPlanct', label: 'BAnT' },
];

// Variable de recuento → columna de % de control equivalente en MonthlyControlDto (backend).
const CONTROL_PERCENT_KEY: Record<MicroVariableKey, keyof MonthlyControlDto> = {
  bsrPlanct: 'bsrControlPercent',
  bpaPlanct: 'bpaControlPercent',
  bhtPlanct: 'bhtControlPercent',
  bAntPlanct: 'bAntControlPercent',
};

export interface ComplianceMonth {
  year: number;
  month: number; // 1-12
  label: string; // 'may/21'
  isCurrent: boolean;
}

export interface ComplianceCell {
  monthLabel: string; // 'may/21', para el tooltip
  taken: number; // mediciones con dato para la variable ese mes
  withinLimit: number; // de esas, cuántas <= COMPLIANCE_THRESHOLD
  outOfLimit: number; // taken - withinLimit
  // % de cumplimiento tal cual lo calcula el backend (monthlyControl); null si el backend no
  // reporta ese mes/variable.
  controlPercent: number | null;
  isCurrent: boolean;
  status: ComplianceStatus;
  label: string; // 'X/Y' o '·' si no hubo muestreo
}

export interface ComplianceRow {
  key: MicroVariableKey;
  label: string;
  cells: ComplianceCell[];
}

export interface ComplianceGrid {
  months: ComplianceMonth[];
  rows: ComplianceRow[];
}

// Ordinal de mes contiguo (año * 12 + mes0), para iterar el rango sin saltos y para indexar.
function toOrdinal(date: Date): number {
  return date.getFullYear() * 12 + date.getMonth();
}

function statusOf(taken: number, outOfLimit: number, isCurrent: boolean): ComplianceStatus {
  if (isCurrent) return 'current'; // el mes en curso siempre se marca azul, tenga o no datos
  if (taken === 0) return 'none';
  if (outOfLimit === 0) return 'ok';
  if (outOfLimit === 1) return 'warn';
  return 'bad';
}

/**
 * Construye el grid a partir de los puntos de la serie (ya ordenados ascendente por fecha) y
 * el `monthlyControl` del backend (para el % de cumplimiento del tooltip). `now` se inyecta
 * para poder testear el resaltado de "mes en curso".
 */
export function buildComplianceGrid(
  points: TimelinePoint[],
  monthlyControl: MonthlyControlDto[] = [],
  now: Date = new Date(),
): ComplianceGrid {
  if (!points.length) return { months: [], rows: [] };

  const nowOrd = toOrdinal(now);
  const startOrd = toOrdinal(points[0].date);
  const lastDataOrd = toOrdinal(points[points.length - 1].date);
  // El rango llega hasta el mes en curso, salvo que haya muestras aún más recientes.
  const endOrd = Math.max(nowOrd, lastDataOrd);

  const months: ComplianceMonth[] = [];
  for (let ord = startOrd; ord <= endOrd; ord++) {
    const year = Math.floor(ord / 12);
    const month = (ord % 12) + 1;
    months.push({
      year,
      month,
      label: `${MESES_ABREV[month - 1]}/${String(year).slice(-2)}`,
      isCurrent: ord === nowOrd,
    });
  }

  // Agrupa los puntos por mes una sola vez -> conteo O(n) por celda.
  const pointsByOrd = new Map<number, TimelinePoint[]>();
  for (const point of points) {
    const ord = toOrdinal(point.date);
    const bucket = pointsByOrd.get(ord);
    if (bucket) bucket.push(point);
    else pointsByOrd.set(ord, [point]);
  }

  // % de cumplimiento del backend indexado por el mismo ordinal de mes.
  const controlByOrd = new Map<number, MonthlyControlDto>();
  for (const row of monthlyControl) {
    controlByOrd.set(row.year * 12 + (row.month - 1), row);
  }

  const rows: ComplianceRow[] = VARIABLE_ROWS.map(({ key, label }) => {
    const cells = months.map((m): ComplianceCell => {
      const ord = m.year * 12 + (m.month - 1);
      const monthPoints = pointsByOrd.get(ord) ?? [];

      let taken = 0;
      let withinLimit = 0;
      for (const point of monthPoints) {
        const value = point[key];
        if (value == null) continue;
        taken += 1;
        if (value <= COMPLIANCE_THRESHOLD) withinLimit += 1;
      }
      const outOfLimit = taken - withinLimit;

      const control = controlByOrd.get(ord);
      const controlPercent = control
        ? ((control[CONTROL_PERCENT_KEY[key]] as number | null) ?? null)
        : null;

      return {
        monthLabel: m.label,
        taken,
        withinLimit,
        outOfLimit,
        controlPercent,
        isCurrent: m.isCurrent,
        status: statusOf(taken, outOfLimit, m.isCurrent),
        label: taken === 0 ? '·' : `${withinLimit}/${taken}`,
      };
    });

    return { key, label, cells };
  });

  return { months, rows };
}
