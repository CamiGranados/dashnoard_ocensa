// microbiology-bache.transform.ts
// Funciones puras (sin Angular) que agrupan la serie temporal en "baches": cada Prebache se
// empareja con el siguiente Postbache cronológico para poder graficar el efecto Pre→Post del
// tratamiento por evento de bacheo.

import { TimelinePoint, toLog10 } from './microbiology-timeline.transform';

export type MicroVariableKey = 'bsrPlanct' | 'bpaPlanct' | 'bhtPlanct' | 'bAntPlanct';

const VARIABLE_KEYS: MicroVariableKey[] = ['bsrPlanct', 'bpaPlanct', 'bhtPlanct', 'bAntPlanct'];

// Reducción mínima (en log10) para considerar el bache "Efectivo". El umbral de control del
// dominio es 10^2 UFC/mL (log10 = 2) -- una variable por debajo de eso está "en control"-- pero
// usarlo como condición de "todas las variables deben terminar en control" no reproduce casos
// reales donde el tratamiento sí funcionó (caída de ≥2 log) sin que todas las variables lleguen
// a ese piso absoluto. Por eso la magnitud de la caída Pre→Post es el criterio de efectividad.
export const EFFECTIVE_LOG_DROP = 2;

export interface BacheVariableSample {
  key: MicroVariableKey;
  pre: number | null;
  post: number | null;
  preLog: number | null;
  postLog: number | null;
}

export type BacheEffectiveness =
  | { kind: 'efectivo'; minLog: number; maxLog: number }
  | { kind: 'rebote'; variables: MicroVariableKey[] }
  | { kind: 'sin-respuesta' };

export interface BachePair {
  label: string;
  preDate: Date | null;
  postDate: Date | null;
  preThpsPercent: number | null;
  postThpsPercent: number | null;
  variables: BacheVariableSample[];
  effectiveness: BacheEffectiveness;
}

const MESES_ABREV_MIN = [
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

function formatBacheLabel(date: Date | null): string {
  if (!date) return 'Bache';
  const dd = String(date.getDate()).padStart(2, '0');
  return `Bache ${dd} ${MESES_ABREV_MIN[date.getMonth()]}`;
}

function buildVariables(
  pre: TimelinePoint | null,
  post: TimelinePoint | null,
): BacheVariableSample[] {
  return VARIABLE_KEYS.map((key) => {
    const preVal = pre ? pre[key] : null;
    const postVal = post ? post[key] : null;
    return {
      key,
      pre: preVal,
      post: postVal,
      preLog: toLog10(preVal),
      postLog: toLog10(postVal),
    };
  });
}

/**
 * Rebote: si alguna variable sube respecto al pre (postLog > preLog), se señala esa variable aunque
 * otras hayan mejorado -- tiene prioridad sobre "efectivo". Efectivo: si ninguna rebota y la mayor
 * caída Pre→Post entre variables es ≥ EFFECTIVE_LOG_DROP log10. En otro caso, "sin respuesta".
 */
function computeEffectiveness(variables: BacheVariableSample[]): BacheEffectiveness {
  const withBoth = variables.filter(
    (v): v is BacheVariableSample & { preLog: number; postLog: number } =>
      v.preLog != null && v.postLog != null,
  );

  const rebote = withBoth.filter((v) => v.postLog > v.preLog);
  if (rebote.length) {
    return { kind: 'rebote', variables: rebote.map((v) => v.key) };
  }

  const drops = withBoth.filter((v) => v.preLog > v.postLog).map((v) => v.preLog - v.postLog);
  const maxDrop = drops.length ? Math.max(...drops) : 0;

  if (maxDrop >= EFFECTIVE_LOG_DROP) {
    const minLog = Math.round(Math.min(...drops));
    const maxLog = Math.round(maxDrop);
    return { kind: 'efectivo', minLog, maxLog };
  }

  return { kind: 'sin-respuesta' };
}

function toBachePair(pre: TimelinePoint | null, post: TimelinePoint | null): BachePair {
  const variables = buildVariables(pre, post);
  const anchor = post?.date ?? pre?.date ?? null;

  return {
    label: formatBacheLabel(anchor),
    preDate: pre?.date ?? null,
    postDate: post?.date ?? null,
    preThpsPercent: pre?.thpsPercent ?? null,
    postThpsPercent: post?.thpsPercent ?? null,
    variables,
    effectiveness: computeEffectiveness(variables),
  };
}

/**
 * Empareja secuencialmente: cada Prebache toma el siguiente Postbache cronológico. Un Prebache
 * sin Postbache posterior (o un Postbache sin Prebache previo) igual genera su propio panel, con
 * el lado faltante en null, para no perder datos silenciosamente.
 */
export function buildBachePairs(points: TimelinePoint[]): BachePair[] {
  const pairs: BachePair[] = [];
  let pendingPre: TimelinePoint | null = null;

  for (const point of points) {
    if (point.category === 'Prebache') {
      if (pendingPre) pairs.push(toBachePair(pendingPre, null));
      pendingPre = point;
    } else {
      pairs.push(toBachePair(pendingPre, point));
      pendingPre = null;
    }
  }

  if (pendingPre) pairs.push(toBachePair(pendingPre, null));

  return pairs;
}
