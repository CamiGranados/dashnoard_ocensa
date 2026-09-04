import { signal, WritableSignal } from '@angular/core';

export type SeriesChartType = 'line' | 'bar';

/** Opciones del `p-selectButton` línea/barra. Idénticas en las 3 gráficas. */
export const CHART_TYPE_OPTIONS: { label: string; value: SeriesChartType }[] = [
  { label: 'Barras', value: 'bar' },
  { label: 'Línea', value: 'line' },
];

export interface SeriesToggles<K extends string> {
  /** Tipo (línea/barra) por serie. */
  readonly types: WritableSignal<Record<K, SeriesChartType>>;
  /** Visibilidad por serie. */
  readonly visible: WritableSignal<Record<K, boolean>>;
  setType(key: K, type: SeriesChartType): void;
  toggle(key: K): void;
}

/**
 * Estado de los toggles de serie (tipo línea/barra + visibilidad) compartido por
 * corrosion / physicochemistry / thps-tolerance. `defaultTypes` fija el tipo inicial
 * de cada serie; todas arrancan visibles. Los setters devuelven objetos nuevos
 * (zoneless: mutar in-place no dispara redibujado).
 */
export function createSeriesToggles<K extends string>(
  defaultTypes: Record<K, SeriesChartType>,
): SeriesToggles<K> {
  const keys = Object.keys(defaultTypes) as K[];
  const types = signal<Record<K, SeriesChartType>>({ ...defaultTypes });
  const visible = signal<Record<K, boolean>>(
    keys.reduce((acc, k) => {
      acc[k] = true;
      return acc;
    }, {} as Record<K, boolean>),
  );

  return {
    types,
    visible,
    setType(key: K, type: SeriesChartType): void {
      types.set({ ...types(), [key]: type });
    },
    toggle(key: K): void {
      visible.set({ ...visible(), [key]: !visible()[key] });
    },
  };
}
