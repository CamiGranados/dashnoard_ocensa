import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type ChartLegendShape = 'circle' | 'triangle' | 'rect' | 'rectRot' | 'line';

export interface ChartLegendItem {
  label: string;
  /** Color ya resuelto (hex/rgb), normalmente vía chartToken(). */
  color: string;
  shape: ChartLegendShape;
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
        <li class="chart-legend__item">
          <i class="chart-legend__swatch shape-{{ item.shape }}" [style.--swatch-color]="item.color"></i>
          {{ item.label }}
        </li>
      }
    </ul>
  `,
  styleUrl: './chart-legend.css',
})
export class ChartLegend {
  readonly items = input.required<ChartLegendItem[]>();
}
