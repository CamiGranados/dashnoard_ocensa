// microbiology-bache.transform.ts
// Funciones puras (sin Angular) que agrupan la serie temporal en "baches": cada Prebache abre
// un bache que absorbe el Postbache y los Seguimientos posteriores, hasta el siguiente Prebache.
// Cada bache se pinta en una o más columnas (máx. MAX_SAMPLES_PER_COLUMN puntos por columna;
// el desborde va a columnas contiguas con el mismo título "ÚLTIMO BACHE").

import { TimelinePoint, toLog10 } from './microbiology-timeline.transform';

export type MicroVariableKey = 'bsrPlanct' | 'bpaPlanct' | 'bhtPlanct' | 'bAntPlanct';

const VARIABLE_KEYS: MicroVariableKey[] = ['bsrPlanct', 'bpaPlanct', 'bhtPlanct', 'bAntPlanct'];

export type BacheRole = 'Pre' | 'Post' | 'Seg';

export interface BacheSample {
  role: BacheRole;
  // Etiqueta que se muestra en el eje X: 'Pre', 'Post', 'Seg 1', 'Seg 2'…
  roleLabel: string;
  date: Date;
  // Fecha de toma de la muestra en formato corto dd/mm/aa (va debajo de roleLabel).
  dateLabel: string;
  thpsPercent: number | null;
  values: Record<MicroVariableKey, number | null>;
  logs: Record<MicroVariableKey, number | null>;
}

export interface BacheGroup {
  // Fecha del Prebache que gobierna el bache. Si el grupo no tiene Prebache propio (p.ej. un
  // Postbache suelto), se arrastra la del último Prebache visto -> la fecha "se repite" hasta
  // que aparece un nuevo Prebache.
  ultimoBacheDate: Date | null;
  ultimoBacheLabel: string;
  // Muestras del ciclo ordenadas cronológicamente (Pre, Post, Seg 1, Seg 2…).
  samples: BacheSample[];
}

// Máximo de puntos (Pre/Post/Seg) por columna: con más, las fechas del eje se enciman.
export const MAX_SAMPLES_PER_COLUMN = 4;

export interface BacheColumn {
  ultimoBacheDate: Date | null;
  ultimoBacheLabel: string;
  // Trozo de las muestras del bache (<= MAX_SAMPLES_PER_COLUMN), en orden cronológico.
  // Cada muestra lleva su propio thpsPercent -> el residual se grafica muestra a muestra.
  samples: BacheSample[];
}

function formatShortDate(date: Date): string {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yy = String(date.getFullYear()).slice(-2);
  return `${dd}/${mm}/${yy}`;
}

function toSample(point: TimelinePoint, role: BacheRole): BacheSample {
  const values = {} as Record<MicroVariableKey, number | null>;
  const logs = {} as Record<MicroVariableKey, number | null>;
  for (const key of VARIABLE_KEYS) {
    values[key] = point[key];
    logs[key] = toLog10(point[key]);
  }
  return {
    role,
    roleLabel: role,
    date: point.date,
    dateLabel: formatShortDate(point.date),
    thpsPercent: point.thpsPercent,
    values,
    logs,
  };
}

interface WorkingGroup {
  samples: BacheSample[];
}

function finalizeGroup(group: WorkingGroup, lastPrebacheDate: Date | null): BacheGroup {
  const samples = group.samples.slice().sort((a, b) => a.date.getTime() - b.date.getTime());

  // Numera los seguimientos en orden cronológico: Seg 1, Seg 2…
  let segCount = 0;
  for (const sample of samples) {
    if (sample.role === 'Seg') {
      segCount += 1;
      sample.roleLabel = `Seg ${segCount}`;
    }
  }

  return {
    ultimoBacheDate: lastPrebacheDate,
    ultimoBacheLabel: lastPrebacheDate ? formatShortDate(lastPrebacheDate) : '—',
    samples,
  };
}

/**
 * Agrupa por evento de bacheo: un Prebache abre un bache nuevo; el Postbache y los Seguimientos
 * siguientes se acumulan en ese mismo bache. Un segundo Postbache sin Prebache de por medio abre
 * otro bache (que hereda la fecha del último Prebache -> "se repite"). Los puntos previos al
 * primer Prebache forman su propio bache con ultimoBacheDate en null ('—').
 */
export function buildBacheGroups(points: TimelinePoint[]): BacheGroup[] {
  const groups: BacheGroup[] = [];
  let current: WorkingGroup | null = null;
  let lastPrebacheDate: Date | null = null;

  const flush = () => {
    if (current && current.samples.length) {
      groups.push(finalizeGroup(current, lastPrebacheDate));
    }
    current = null;
  };

  for (const point of points) {
    if (point.category === 'Prebache') {
      flush();
      lastPrebacheDate = point.date;
      current = { samples: [toSample(point, 'Pre')] };
    } else if (point.category === 'Postbache') {
      if (current?.samples.some((s) => s.role === 'Post')) flush();
      current ??= { samples: [] };
      current.samples.push(toSample(point, 'Post'));
    } else {
      current ??= { samples: [] };
      current.samples.push(toSample(point, 'Seg'));
    }
  }

  flush();

  return groups;
}

/**
 * Aplana los baches a columnas para la gráfica: cada bache se parte en trozos de
 * MAX_SAMPLES_PER_COLUMN muestras. Todos los trozos de un mismo bache comparten el título
 * "ÚLTIMO BACHE" (misma fecha de prebache). Cada columna grafica el residual THPS de cada una
 * de sus muestras.
 */
export function buildBacheColumns(points: TimelinePoint[]): BacheColumn[] {
  return buildBacheGroups(points).flatMap((group) => {
    const chunkCount = Math.max(1, Math.ceil(group.samples.length / MAX_SAMPLES_PER_COLUMN));

    return Array.from({ length: chunkCount }, (_, i): BacheColumn => ({
      ultimoBacheDate: group.ultimoBacheDate,
      ultimoBacheLabel: group.ultimoBacheLabel,
      samples: group.samples.slice(i * MAX_SAMPLES_PER_COLUMN, (i + 1) * MAX_SAMPLES_PER_COLUMN),
    }));
  });
}
