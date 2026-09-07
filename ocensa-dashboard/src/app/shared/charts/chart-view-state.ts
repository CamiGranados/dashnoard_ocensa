import { computed, signal, Signal, WritableSignal } from '@angular/core';

/** Modo de interacción del ratón sobre la gráfica. `pan` es el modo por defecto. */
export type ChartInteractionMode = 'pan' | 'select';

/** Rango visible persistido tras un zoom/pan (índices o timestamps del eje). */
export interface ChartZoomBounds {
  x?: readonly [number, number];
  y?: readonly [number, number];
}

export interface ChartViewState {
  /** Modo de interacción (`pan` | `select`). Enlazado a los botones de modo de la barra. */
  readonly mode: WritableSignal<ChartInteractionMode>;
  /**
   * Rango visible tras zoom/pan. Se persiste fuera de `data`/`options` para re-aplicarlo
   * después del `reinit()` que hace `<p-chart>` en cada cambio de entrada. `null` = sin zoom.
   */
  readonly zoomBounds: WritableSignal<ChartZoomBounds | null>;
  /** Nivel de zoom acumulado (1 = base). Lo refresca `ChartFrame` desde `chart.getZoomLevel()`. */
  readonly zoomLevel: WritableSignal<number>;
  /** Las líneas de referencia están visibles (herramienta del menú "más opciones"). */
  readonly refLinesVisible: WritableSignal<boolean>;
  /** La gráfica está abierta en el modal de "expandir". */
  readonly expanded: WritableSignal<boolean>;
  /** Se puede seguir acercando (nivel por debajo del tope). */
  readonly canZoomIn: Signal<boolean>;
  /** Se puede alejar (hay zoom aplicado por encima de la base). */
  readonly canZoomOut: Signal<boolean>;
  /** Hay zoom o desplazamiento aplicado respecto al estado inicial. */
  readonly isZoomed: Signal<boolean>;
  /** Devuelve TODO al estado inicial salvo `expanded`: zoom, pan, modo y líneas de referencia. */
  reset(): void;
}

const MIN_ZOOM = 1;
const EPS = 1e-6;

/**
 * Estado de "vista" de una gráfica (zoom, pan, modo de interacción, líneas de referencia,
 * expandido), compartido por `ChartFrame` y `ChartToolbar`. Sigue el patrón de
 * `createWindowState` / `createSeriesToggles`: una factoría que devuelve signals.
 *
 * No usa `effect`, así que puede instanciarse en cualquier sitio (no requiere contexto de
 * inyección), pero se recomienda como inicializador de campo del componente que lo use.
 */
export function createChartViewState(opts: { maxZoom?: number } = {}): ChartViewState {
  const maxZoom = opts.maxZoom ?? 10;

  const mode = signal<ChartInteractionMode>('pan');
  const zoomBounds = signal<ChartZoomBounds | null>(null);
  const zoomLevel = signal(MIN_ZOOM);
  const refLinesVisible = signal(true);
  const expanded = signal(false);

  const canZoomIn = computed(() => zoomLevel() < maxZoom - EPS);
  const canZoomOut = computed(() => zoomLevel() > MIN_ZOOM + EPS);
  const isZoomed = computed(() => zoomLevel() > MIN_ZOOM + EPS || zoomBounds() !== null);

  return {
    mode,
    zoomBounds,
    zoomLevel,
    refLinesVisible,
    expanded,
    canZoomIn,
    canZoomOut,
    isZoomed,
    reset(): void {
      mode.set('pan');
      zoomBounds.set(null);
      zoomLevel.set(MIN_ZOOM);
      refLinesVisible.set(true);
    },
  };
}
