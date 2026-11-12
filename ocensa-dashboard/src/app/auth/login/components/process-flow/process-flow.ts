import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Partícula de la gráfica 02: sale de (x, y) y viaja en línea recta hasta el nodo central. */
interface FlowParticle {
  readonly x: number;
  readonly y: number;
  /** Desplazamiento hasta el nodo (custom properties `--dx`/`--dy` que consume `pf-particle`). */
  readonly dx: string;
  readonly dy: string;
  /** Desfase negativo: todas arrancan ya en movimiento, repartidas a lo largo del ciclo. */
  readonly delay: string;
}

/** Todas las coordenadas están en unidades del viewBox de las mini-gráficas (100×48). */
const HUB = { x: 50, y: 24 } as const;

/** Orígenes en el borde, intercalados izquierda/derecha para que las llegadas alternen. */
const PARTICLE_ORIGINS: readonly (readonly [number, number])[] = [
  [6, 6],
  [94, 42],
  [6, 24],
  [94, 6],
  [30, 3],
  [94, 24],
  [6, 42],
  [70, 45],
];

/** Duración del ciclo de una partícula en segundos; debe coincidir con `.pf-particle` del CSS. */
const PARTICLE_CYCLE_S = 2.4;

/** Traza tipo ECG (línea base y = 28) con el nodo de monitoreo en (50, 28). */
const ECG_PATH =
  'M2 28 H12 L14 25 L16 28 H19 L20.5 31 L23 8 L25.5 36 L27 28 H30 L32.5 24 L35 28 ' +
  'H62 L64 25 L66 28 H69 L70.5 31 L73 8 L75.5 36 L77 28 H80 L82.5 24 L85 28 H98';

/** Tendencia ascendente de la gráfica 03; termina en (96, 8), donde brilla el punto final. */
const TREND_PATH = 'M4 40 L16 35 L28 37 L40 29 L52 30 L64 21 L76 17 L88 11 L96 8';

let nextUid = 0;

/**
 * Flujo "De la planta a la decisión" del panel izquierdo del login: 3 tarjetas con
 * mini-gráficas SVG animadas sólo con CSS (transform / opacity / stroke-dashoffset).
 * Toda la temporización vive en process-flow.css; con `prefers-reduced-motion` queda estático.
 */
@Component({
  selector: 'app-process-flow',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './process-flow.html',
  styleUrl: './process-flow.css',
})
export class ProcessFlow {
  /** Prefijo único para ids del documento (degradado SVG, aria-labelledby). */
  protected readonly uid = `pf-${nextUid++}`;

  protected readonly hub = HUB;
  protected readonly ecgPath = ECG_PATH;
  protected readonly trendPath = TREND_PATH;
  protected readonly trendAreaPath = `${TREND_PATH} L96 46 L4 46 Z`;

  protected readonly particles: readonly FlowParticle[] = PARTICLE_ORIGINS.map(([x, y], i) => ({
    x,
    y,
    dx: `${HUB.x - x}px`,
    dy: `${HUB.y - y}px`,
    delay: `${(-(i * PARTICLE_CYCLE_S) / PARTICLE_ORIGINS.length).toFixed(2)}s`,
  }));
}
