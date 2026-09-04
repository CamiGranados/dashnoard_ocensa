import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChartModule } from 'primeng/chart';
import { MicrobiologyService } from '../../../../core/services/microbiology.service';
import { buildTimelinePoints } from './microbiology-timeline.transform';
import type { TimelinePoint } from './microbiology-timeline.transform';
import { buildBacheColumns } from './microbiology-bache.transform';
import type { BacheColumn, BacheSample, MicroVariableKey } from './microbiology-bache.transform';
import { buildComplianceGrid } from './microbiology-compliance.transform';
import type { ComplianceGrid, ComplianceStatus } from './microbiology-compliance.transform';
import { chartToken, PLANCTONICA_TOKEN } from '../../../../shared/charts/chart-tokens';
import { applyChartDefaults } from '../../../../shared/charts/chart-defaults';
import { ChartLegend, ChartLegendItem } from '../../../../shared/charts/chart-legend/chart-legend';

interface SeriesConfig {
  label: string;
  /** Nombre del token de color (chart-tokens.css); se resuelve con chartToken(). */
  token: string;
  pointStyle: 'circle' | 'triangle' | 'rect' | 'rectRot';
}

// Mismos colores para bsr/bpa/bht/bant que thps-tolerance: tokens de dominio compartidos en
// chart-tokens.css, para que la lectura sea consistente entre tabs.
const SCATTER_SERIES: Record<MicroVariableKey, SeriesConfig> = {
  bsrPlanct: { label: 'BSR', token: PLANCTONICA_TOKEN.bsr, pointStyle: 'circle' },
  bpaPlanct: { label: 'BPA', token: PLANCTONICA_TOKEN.bpa, pointStyle: 'triangle' },
  bhtPlanct: { label: 'BHT', token: PLANCTONICA_TOKEN.bht, pointStyle: 'rect' },
  bAntPlanct: { label: 'BAnT', token: PLANCTONICA_TOKEN.bant, pointStyle: 'rectRot' },
};

// Umbral de control del dominio: 10^2 UFC/mL == log10 2. Se dibuja como línea punteada de
// referencia en la gráfica del ciclo Pre → Post → Seg.
const CONTROL_THRESHOLD_LOG = 2;

interface BacheChart {
  column: BacheColumn;
  // Cada label es [rol, fecha] -> Chart.js lo pinta en dos líneas bajo el punto.
  data: { labels: string[][]; datasets: unknown[] };
  options: Record<string, unknown>;
}

@Component({
  selector: 'app-microbiology',
  imports: [CommonModule, ChartModule, ChartLegend],
  templateUrl: './microbiology.html',
  styleUrl: './microbiology.css',
})
export class Microbiology {
  private readonly microbiologyService = inject(MicrobiologyService);

  readonly review = this.microbiologyService.review;

  constructor() {
    applyChartDefaults();
  }

  readonly records = computed(() => this.review.value()?.data ?? []);
  readonly totalRecords = computed(() => this.records().length);

  // Umbral de residual THPS confirmado por el usuario (mismo % que ya se usaba como
  // referencia "Límite 20%" en la gráfica anterior de serie temporal).
  readonly RESIDUAL_MIN = 20;

  // La leyenda del residual es de ESTADO (≤20% ok / >20% deficiente), igual que las barras que
  // realmente se pintan (--chart-residual-ok / --chart-residual-bad). El ítem gris único
  // anterior no correspondía con ningún elemento del gráfico.
  readonly legendItems = computed<ChartLegendItem[]>(() => [
    { label: 'BSR', color: chartToken(SCATTER_SERIES.bsrPlanct.token), shape: 'circle' },
    { label: 'BPA', color: chartToken(SCATTER_SERIES.bpaPlanct.token), shape: 'triangle' },
    { label: 'BHT', color: chartToken(SCATTER_SERIES.bhtPlanct.token), shape: 'rect' },
    { label: 'BAnT', color: chartToken(SCATTER_SERIES.bAntPlanct.token), shape: 'rectRot' },
    { label: 'Residual ≤20%', color: chartToken('--chart-residual-ok'), shape: 'rect' },
    { label: 'Residual >20%', color: chartToken('--chart-residual-bad'), shape: 'rect' },
  ]);

  // ----------------- Gráfica superior: ciclo Pre → Post → Seg por bache -----------------
  readonly timelinePoints = computed<TimelinePoint[]>(() => buildTimelinePoints(this.records()));
  readonly bacheColumns = computed<BacheColumn[]>(() => buildBacheColumns(this.timelinePoints()));

  readonly bacheCharts = computed<BacheChart[]>(() =>
    this.bacheColumns().map((column, index) => ({
      column,
      data: this.buildBacheLineData(column),
      options: this.buildBacheLineOptions(index === 0),
    })),
  );

  // Todos los % de residual THPS (una muestra puede traer valores negativos por ruido de medición).
  private readonly residualValues = computed<number[]>(() =>
    this.bacheColumns()
      .flatMap((c) => c.samples)
      .map((s) => s.thpsPercent)
      .filter((v): v is number => v != null),
  );

  readonly residualDomainMax = computed(
    () => Math.ceil(Math.max(30, ...this.residualValues(), 0) / 10) * 10,
  );

  // 0 salvo que haya residuales negativos, en cuyo caso baja al múltiplo de 10 inferior.
  readonly residualDomainMin = computed(
    () => Math.floor(Math.min(0, ...this.residualValues()) / 10) * 10,
  );

  private readonly residualRange = computed(
    () => this.residualDomainMax() - this.residualDomainMin(),
  );

  // Posición (% desde arriba) de la línea base 0 y de la línea de referencia RESIDUAL_MIN.
  readonly residualZeroTopPct = computed(
    () => (this.residualDomainMax() / this.residualRange()) * 100,
  );
  readonly residualThresholdTopPct = computed(
    () => ((this.residualDomainMax() - this.RESIDUAL_MIN) / this.residualRange()) * 100,
  );

  readonly residualTicks = computed(() => {
    const max = this.residualDomainMax();
    const step = this.residualRange() / 3;
    return [max, max - step, max - 2 * step, this.residualDomainMin()];
  });

  // Geometría (% top/height dentro del área de dibujo) de la barra de una muestra: crece desde
  // la línea 0 hacia arriba si el residual es positivo, hacia abajo si es negativo.
  residualBarStyle(sample: BacheSample): { top: string; height: string } {
    const v = sample.thpsPercent;
    if (v == null) return { top: '0', height: '0' };
    const range = this.residualRange();
    const top = ((this.residualDomainMax() - Math.max(v, 0)) / range) * 100;
    const height = (Math.abs(v) / range) * 100;
    return { top: `${top}%`, height: `${height}%` };
  }

  // null = muestra sin dato de residual
  residualSampleOk(sample: BacheSample): boolean | null {
    const v = sample.thpsPercent;
    return v == null ? null : v <= this.RESIDUAL_MIN;
  }

  // Veredicto de la columna (peor caso): Deficiente si alguna muestra supera RESIDUAL_MIN.
  // sectionResidualOk(column: BacheColumn): boolean | null {
  //   const values = column.samples.map((s) => s.thpsPercent).filter((v): v is number => v != null);
  //   if (!values.length) return null;
  //   return values.every((v) => v <= this.RESIDUAL_MIN);
  // }

  private buildBacheLineData(column: BacheColumn): { labels: string[][]; datasets: unknown[] } {
    const keys = Object.keys(SCATTER_SERIES) as MicroVariableKey[];

    const datasets = keys.map((key) => {
      const cfg = SCATTER_SERIES[key];
      const color = chartToken(cfg.token);
      return {
        label: cfg.label,
        data: column.samples.map((s) => s.logs[key]),
        borderColor: color,
        backgroundColor: color,
        pointBackgroundColor: color,
        pointStyle: cfg.pointStyle,
        pointRadius: 5,
        pointHoverRadius: 6,
        borderWidth: 2,
        tension: 0,
        spanGaps: true,
      };
    });

    const thresholdDataset = {
      label: 'Límite de control',
      data: column.samples.map(() => CONTROL_THRESHOLD_LOG),
      borderColor: chartToken('--chart-limite-control'),
      borderWidth: 1.5,
      borderDash: [4, 4],
      pointRadius: 0,
      pointHoverRadius: 0,
      tension: 0,
    };

    // Cada label = [rol, fecha de toma]; Chart.js pinta las dos líneas bajo el punto.
    const labels = column.samples.map((s) => [s.roleLabel, s.dateLabel]);

    return { labels, datasets: [...datasets, thresholdDataset] };
  }

  private buildBacheLineOptions(showAxis: boolean): Record<string, unknown> {
    return {
      responsive: true,
      // Cromo (tooltip color, grid, color de ejes, maintainAspectRatio) -> Chart.defaults.
      plugins: {
        legend: { display: false },
        tooltip: {
          padding: 10, // más compacto que el default (12)
          filter: (item: any) => item.dataset.label !== 'Límite de control',
          callbacks: {
            label: (context: any) => {
              const value = context.parsed.y;
              return value == null
                ? `${context.dataset.label}: sin dato`
                : `${context.dataset.label}: ${Number(value).toFixed(1)} log10`;
            },
          },
        },
      },
      scales: {
        x: {
          // offset: los puntos quedan centrados en su banda -> alinean con las barras de
          // residual de abajo (una barra por muestra, centrada en su porción de ancho).
          offset: true,
          grid: { display: false },
          ticks: { font: { size: 9 }, autoSkip: false, maxRotation: 0 },
        },
        y: {
          min: 0,
          max: 6,
          title: {
            display: showAxis,
            text: 'log10 (Bact/mL)',
            font: { size: 11 },
          },
          ticks: showAxis ? { stepSize: 1 } : { display: false },
        },
      },
    };
  }

  // ------------------- Grid de cumplimiento mensual por variable -------------------
  // Una fila por variable, una columna por mes (primer dato → mes en curso). Cada celda muestra
  // "X/Y": Y mediciones tomadas ese mes, X de ellas en o por debajo de 10² UFC/mL.
  readonly complianceGrid = computed<ComplianceGrid>(() =>
    buildComplianceGrid(this.timelinePoints(), this.review.value()?.monthlyControl ?? []),
  );

  readonly complianceLegend: { label: string; status: ComplianceStatus }[] = [
    { label: 'Todas dentro de límite', status: 'ok' },
    { label: '1 fuera de límite', status: 'warn' },
    { label: '2 o más fuera', status: 'bad' },
    { label: 'Sin muestreo', status: 'none' },
    { label: 'Mes en curso', status: 'current' },
  ];
}
