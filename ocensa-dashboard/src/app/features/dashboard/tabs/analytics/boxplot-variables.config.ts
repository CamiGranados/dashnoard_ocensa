import {
  BiocideControlWindow,
  BoxSpreadMetric,
} from '../../../../core/models/biocide-control.model';

/** Configuración por variable de la tarjeta boxplot. Nada de esto va hardcodeado en el template. */
export interface BoxVariableConfig {
  /** Campo de BiocideControlWindow con los valores crudos (para σ/CV y fechas de outliers). */
  field: keyof BiocideControlWindow;
  /** Nombre del token de color (chart-tokens.css). */
  colorToken: string;
  /** σ para magnitudes pequeñas, CV para magnitudes grandes (ppm, volúmenes, µS/cm…). */
  spreadMetric: BoxSpreadMetric;
  /** Banda de referencia sombreada (rango seguro). Sin valor: no se dibuja. */
  safeBand?: { min: number; max: number };
  /** Umbral/límite: línea discontinua y estado "Supera límite". Sin valor: no se dibuja. */
  limit?: number;
}

interface Rule {
  /** Se prueba contra `variable + label` normalizado (minúsculas, sin acentos ni símbolos). */
  match: RegExp;
  config: BoxVariableConfig;
}

// Orden importa: la primera regla que coincide gana.
const RULES: Rule[] = [
  { match: /thps/, config: { field: 'thpsPercent', colorToken: '--chart-bx-thps', spreadMetric: 'sigma' } },
  { match: /bsw/, config: { field: 'bswPercent', colorToken: '--chart-bx-bsw', spreadMetric: 'sigma' } },
  { match: /dosis|dose/, config: { field: 'actualInjectedDose', colorToken: '--chart-bx-dosis', spreadMetric: 'cv' } },
  { match: /temp/, config: { field: 'temperatureC', colorToken: '--chart-fq-temperatura', spreadMetric: 'sigma' } },
  { match: /volum/, config: { field: 'realVolume', colorToken: '--chart-bx-volumen', spreadMetric: 'cv' } },
  { match: /h2s/, config: { field: 'h2S', colorToken: '--chart-fq-h2s', spreadMetric: 'sigma' } },
  { match: /conduct/, config: { field: 'conductivity', colorToken: '--chart-fq-conductividad', spreadMetric: 'cv' } },
  { match: /alcalin/, config: { field: 'alkalinity', colorToken: '--chart-fq-alcalinidad', spreadMetric: 'cv' } },
  { match: /calci/, config: { field: 'calcium', colorToken: '--chart-fq-calcio', spreadMetric: 'cv' } },
  { match: /^ph|\bph\b|ph$/, config: { field: 'ph', colorToken: '--chart-fq-ph', spreadMetric: 'sigma' } },
];

const normalize = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '');

export function boxVariableConfig(variable: string, label: string): BoxVariableConfig | null {
  const key = normalize(`${variable} ${label}`);
  return RULES.find((r) => r.match.test(key))?.config ?? null;
}
