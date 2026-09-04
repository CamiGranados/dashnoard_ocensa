import { effect, signal, Signal, WritableSignal } from '@angular/core';

export interface WindowState {
  /** Nº de puntos visibles en la ventana. */
  readonly size: number;
  /** Índice del primer punto visible. Enlazable con `[(ngModel)]` del slider. */
  readonly position: WritableSignal<number>;
  /** `[inicio, fin]` de índices visibles (fin incluido). */
  readonly range: Signal<readonly [number, number]>;
  /** Desplaza la ventana al arrastrar el slider a la posición `p`. */
  move(p: number): void;
  /** Reencuadra en los últimos `size` puntos (botón "Restablecer zoom"). */
  reset(): void;
}

/**
 * Estado de la "ventana visible" (scroll horizontal de los últimos `size` puntos),
 * compartido por corrosion / thps-tolerance / physicochemistry. La gráfica recibe
 * SIEMPRE todo el histórico; esta ventana sólo desplaza el rango dibujado
 * (`scales.x.min/max` o un `.slice()`), así los ejes Y y la leyenda no se reescalan.
 *
 * Debe instanciarse en contexto de inyección (inicializador de campo o constructor):
 * usa `effect` para reencuadrar cuando `total` cambia (llegan datos nuevos).
 */
export function createWindowState(total: Signal<number>, size = 60): WindowState {
  const position = signal(0);
  const range = signal<readonly [number, number]>([0, 0]);

  const reframe = (): void => {
    const n = total();
    if (n === 0) {
      position.set(0);
      range.set([0, 0]);
      return;
    }
    const start = Math.max(0, n - size);
    position.set(start);
    range.set([start, n - 1]);
  };

  // Al llegar datos nuevos (cambio de filtros) la ventana vuelve a los últimos puntos.
  effect(reframe);

  return {
    size,
    position,
    range: range.asReadonly(),
    move(p: number): void {
      const lastIdx = Math.max(0, total() - 1);
      const start = Math.min(Math.max(p, 0), lastIdx);
      range.set([start, Math.min(start + size, lastIdx)]);
    },
    reset: reframe,
  };
}
