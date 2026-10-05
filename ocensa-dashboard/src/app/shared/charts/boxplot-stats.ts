import { BoxplotGroupStats } from '../../core/models/biocide-control.model';

/** Estadísticas de un boxplot, con las derivadas (IQR, σ, CV) que el backend no envía. */
export interface BoxplotStats {
  count: number;
  min: number;
  max: number;
  q1: number;
  median: number;
  q3: number;
  /** Q3 − Q1. */
  iqr: number;
  /** Bigotes a 1.5·IQR, acotados a datos reales. */
  whiskerMin: number;
  whiskerMax: number;
  outliers: number[];
  mean: number | null;
  /** Desviación estándar muestral (n−1); `null` si no hay valores crudos. */
  stdDev: number | null;
  /** σ / media · 100; `null` si no hay σ o la media es 0. */
  cv: number | null;
}

/** Cuantil por interpolación lineal (método 7) sobre un arreglo ya ordenado. */
function quantile(sorted: number[], p: number): number {
  const pos = (sorted.length - 1) * p;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

function meanAndStdDev(values: number[]): { mean: number; stdDev: number; cv: number | null } {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance =
    values.length > 1 ? values.reduce((a, b) => a + (b - mean) ** 2, 0) / (values.length - 1) : 0;
  const stdDev = Math.sqrt(variance);
  return { mean, stdDev, cv: mean !== 0 ? (stdDev / Math.abs(mean)) * 100 : null };
}

/** Calcula todas las estadísticas desde valores crudos. `null` si no hay valores finitos. */
export function computeBoxplotStats(raw: readonly (number | null | undefined)[]): BoxplotStats | null {
  const values = raw.filter((v): v is number => v != null && Number.isFinite(v));
  if (!values.length) return null;

  const sorted = [...values].sort((a, b) => a - b);
  const q1 = quantile(sorted, 0.25);
  const median = quantile(sorted, 0.5);
  const q3 = quantile(sorted, 0.75);
  const iqr = q3 - q1;
  const lowFence = q1 - 1.5 * iqr;
  const highFence = q3 + 1.5 * iqr;
  const inside = sorted.filter((v) => v >= lowFence && v <= highFence);
  const { mean, stdDev, cv } = meanAndStdDev(values);

  return {
    count: values.length,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    q1,
    median,
    q3,
    iqr,
    whiskerMin: inside[0],
    whiskerMax: inside[inside.length - 1],
    outliers: sorted.filter((v) => v < lowFence || v > highFence),
    mean,
    stdDev,
    cv,
  };
}

/**
 * Estadísticas de un grupo del backend: los cuartiles/bigotes/outliers son los del backend (los
 * mismos que dibuja la caja) y sólo σ/CV/media se derivan de los valores crudos, si los hay.
 */
export function boxplotStatsFromGroup(
  group: BoxplotGroupStats | null,
  raw: readonly (number | null | undefined)[] = [],
): BoxplotStats | null {
  if (!group) return null;
  const values = raw.filter((v): v is number => v != null && Number.isFinite(v));
  const spread = values.length ? meanAndStdDev(values) : null;
  return {
    count: group.count,
    min: group.absoluteMin,
    max: group.absoluteMax,
    q1: group.q1,
    median: group.median,
    q3: group.q3,
    iqr: group.q3 - group.q1,
    whiskerMin: group.whiskerMin,
    whiskerMax: group.whiskerMax,
    outliers: group.outliers,
    mean: spread?.mean ?? null,
    stdDev: spread?.stdDev ?? null,
    cv: spread?.cv ?? null,
  };
}
