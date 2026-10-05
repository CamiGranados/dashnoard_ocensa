import { ChangeDetectionStrategy, Component, computed, input, signal, viewChild } from '@angular/core';
import { ChartModule, UIChart } from 'primeng/chart';
import { VariableBoxChart } from '../../../core/models/biocide-control.model';
import { downloadDataUrl } from '../chart-export';
import { applyChartDefaults } from '../chart-defaults';

type FooterState = 'limit' | 'outliers' | 'stable' | 'dispersion';

/** Subíndices/superíndices Unicode para títulos químicos (H2S → H₂S, Ca2+ → Ca²⁺). */
const CHEM_TITLE: [RegExp, string][] = [
  [/H2S/g, 'H₂S'],
  [/CO2/g, 'CO₂'],
  [/Ca2\+/g, 'Ca²⁺'],
  [/Mg2\+/g, 'Mg²⁺'],
];

/** CV por debajo del cual, sin outliers, la distribución se considera estable. */
const STABLE_CV_MAX = 30;

const NUMBER_FORMAT = new Intl.NumberFormat('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function formatBoxNumber(n: number | null | undefined): string {
  return n == null || !Number.isFinite(n) ? '—' : NUMBER_FORMAT.format(n);
}

/**
 * Tarjeta de boxplot Controlado vs No controlado de una variable: cabecera con acciones,
 * mediana + IQR, gráfica sobre papel cuadriculado y pie con estado/dispersión.
 * Los valores (estadísticas, color, opciones, plugin) los arma el contenedor.
 */
@Component({
  selector: 'app-boxplot-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ChartModule],
  templateUrl: './boxplot-card.html',
  styleUrl: './boxplot-card.css',
  host: { '(document:keydown.escape)': 'expanded.set(false)' },
})
export class BoxplotCard {
  readonly chart = input.required<VariableBoxChart>();

  protected readonly expanded = signal(false);
  private readonly uiChart = viewChild(UIChart);

  protected readonly fmt = formatBoxNumber;

  constructor() {
    applyChartDefaults();
  }

  protected readonly title = computed(() =>
    CHEM_TITLE.reduce((t, [re, rep]) => t.replace(re, rep), this.chart().label),
  );

  protected readonly footerState = computed<FooterState>(() => {
    const c = this.chart();
    const s = c.stats;
    if (c.limit != null && s && s.max > c.limit) return 'limit';
    if (c.outlierCount > 0) return 'outliers';
    if (s?.cv != null && s.cv > STABLE_CV_MAX) return 'dispersion';
    return 'stable';
  });

  protected readonly footerText = computed(() => {
    switch (this.footerState()) {
      case 'limit':
        return 'Supera límite';
      case 'outliers': {
        const n = this.chart().outlierCount;
        return `${n} outlier${n === 1 ? '' : 's'}`;
      }
      case 'dispersion':
        return 'Dispersión alta';
      default:
        return 'Distribución estable';
    }
  });

  protected readonly spreadText = computed(() => {
    const c = this.chart();
    const s = c.stats;
    if (!s) return null;
    if (c.spreadMetric === 'cv') return s.cv == null ? null : `CV = ${formatBoxNumber(s.cv)}%`;
    return s.stdDev == null ? null : `σ = ${formatBoxNumber(s.stdDev)}`;
  });

  protected download(): void {
    const chart = this.uiChart()?.chart;
    if (!chart) return;
    downloadDataUrl(chart.toBase64Image('image/png', 1), `biocida-${this.chart().variable}.png`);
  }
}
