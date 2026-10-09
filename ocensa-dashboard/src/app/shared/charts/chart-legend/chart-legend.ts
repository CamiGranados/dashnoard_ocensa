import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export type ChartLegendShape = 'circle' | 'triangle' | 'rect' | 'rectRot' | 'line';

export interface ChartLegendItem {
  label: string;
  /** Color ya resuelto (hex/rgb), normalmente vía chartToken(). */
  color: string;
  shape: ChartLegendShape;
  /** Si viene, el ítem es clicable y emite este valor por `itemToggle`. */
  key?: string;
  /** Ítem apagado (serie oculta): se atenúa y se tacha. */
  hidden?: boolean;
}

/**
 * Leyenda presentacional para las gráficas que no usan la leyenda nativa de
 * Chart.js (hoy: la gráfica de baches de microbiology). El color de cada swatch
 * entra por la custom property `--swatch-color`; la forma la da la clase
 * `shape-*` — sin ternarios `[style.background]` en el template.
 */
@Component({
  selector: 'app-chart-legend',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ul class="chart-legend">
      @for (item of items(); track item.label) {
        <li class="chart-legend__item" [class.is-hidden]="item.hidden">
          @if (item.key; as key) {
            <button
              type="button"
              class="chart-legend__btn"
              [attr.aria-pressed]="!item.hidden"
              (click)="itemToggle.emit(key)"
            >
              <i class="chart-legend__swatch shape-{{ item.shape }}" [style.--swatch-color]="item.color"></i>
              {{ item.label }}
            </button>
          } @else {
            <i class="chart-legend__swatch shape-{{ item.shape }}" [style.--swatch-color]="item.color"></i>
            {{ item.label }}
          }
        </li>
      }
    </ul>
  `,
  styleUrl: './chart-legend.css',
})
export class ChartLegend {
  readonly items = input.required<ChartLegendItem[]>();
  readonly itemToggle = output<string>();
}
