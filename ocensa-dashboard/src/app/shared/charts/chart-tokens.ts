/**
 * Puente entre los tokens CSS de las gráficas (chart-tokens.css, en :root) y la
 * config JS de Chart.js. `p-chart` pinta sobre <canvas>, así que el color no puede
 * entrar por CSS: se lee aquí con getComputedStyle y se pasa a los datasets /
 * Chart.defaults.
 *
 * Los componentes guardan el NOMBRE del token (no el hex) en su SERIES_CONFIG y lo
 * resuelven con `chartToken(cfg.color)` al armar los datasets. Así no queda ningún
 * hex hardcodeado en los .ts de gráficas: la fuente única es chart-tokens.css.
 */

let cache: Map<string, string> | null = null;

/**
 * Lee una CSS custom property de `:root`. Cachea: una sola lectura de
 * getComputedStyle por token. `fallback` cubre entornos sin DOM (tests unitarios).
 */
export function chartToken(name: string, fallback = ''): string {
  if (typeof document === 'undefined') return fallback;
  cache ??= new Map<string, string>();
  const cached = cache.get(name);
  if (cached !== undefined) return cached;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const resolved = value || fallback;
  cache.set(name, resolved);
  return resolved;
}

/** Sólo para tests: invalida la caché de tokens tras cambiar el DOM. */
export function resetChartTokenCache(): void {
  cache = null;
}

// ----------------------------------------------------------------------------
// Catálogos de series tipados. Guardan el nombre del token, no el color.
// ----------------------------------------------------------------------------

/** Bacterias planctónicas: mismo color en microbiology y en thps-tolerance. */
export type PlanctonicaKey = 'bsr' | 'bpa' | 'bht' | 'bant';

export const PLANCTONICA_TOKEN: Record<PlanctonicaKey, string> = {
  bsr: '--chart-bsr',
  bpa: '--chart-bpa',
  bht: '--chart-bht',
  bant: '--chart-bant',
};

/** FWV: mismo color en corrosion y en thps-tolerance. */
export type FwvKey = 'reportada' | 'estimada' | 'calculada' | 'incrementada';

export const FWV_TOKEN: Record<FwvKey, string> = {
  reportada: '--chart-fwv-reportada',
  estimada: '--chart-fwv-estimada',
  calculada: '--chart-fwv-calculada',
  incrementada: '--chart-fwv-incrementada',
};
