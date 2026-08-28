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

interface SeriesConfig {
  label: string;
  color: string;
  pointStyle: 'circle' | 'triangle' | 'rect' | 'rectRot';
}

// Mismos colores para bsr/bpa/bht/bant que ya usa thps-tolerance, para que la lectura sea
// consistente entre tabs aunque esta gráfica no importe ese archivo.
const SCATTER_SERIES: Record<MicroVariableKey, SeriesConfig> = {
  bsrPlanct: { label: 'BSR', color: '#2e81d4', pointStyle: 'circle' },
  bpaPlanct: { label: 'BPA', color: '#e8590c', pointStyle: 'triangle' },
  bhtPlanct: { label: 'BHT', color: '#239a59', pointStyle: 'rect' },
  bAntPlanct: { label: 'BAnT', color: '#43474f', pointStyle: 'rectRot' },
};

const RESIDUAL_COLOR = '#9aa5b8';

// Umbral de control del dominio: 10^2 UFC/mL == log10 2. Se dibuja como línea punteada de
// referencia en la gráfica del ciclo Pre → Post → Seg.
const CONTROL_THRESHOLD_LOG = 2;
const THRESHOLD_COLOR = '#07a771';

interface BacheChart {
  column: BacheColumn;
  // Cada label es [rol, fecha] -> Chart.js lo pinta en dos líneas bajo el punto.
  data: { labels: string[][]; datasets: unknown[] };
  options: Record<string, unknown>;
}

@Component({
  selector: 'app-microbiology',
  imports: [CommonModule, ChartModule],
  templateUrl: './microbiology.html',
  styleUrl: './microbiology.css',
})
export class Microbiology {
  private readonly microbiologyService = inject(MicrobiologyService);

  readonly review = this.microbiologyService.review;

  readonly records = computed(() => this.review.value()?.data ?? []);
  readonly totalRecords = computed(() => this.records().length);

  // Umbral de residual THPS confirmado por el usuario (mismo % que ya se usaba como
  // referencia "Límite 20%" en la gráfica anterior de serie temporal).
  readonly RESIDUAL_MIN = 20;

  readonly legendItems: { label: string; color: string; shape: SeriesConfig['pointStyle'] }[] = [
    { label: 'BSR', color: SCATTER_SERIES.bsrPlanct.color, shape: 'circle' },
    { label: 'BPA', color: SCATTER_SERIES.bpaPlanct.color, shape: 'triangle' },
    { label: 'BHT', color: SCATTER_SERIES.bhtPlanct.color, shape: 'rect' },
    { label: 'BAnT', color: SCATTER_SERIES.bAntPlanct.color, shape: 'rectRot' },
    { label: 'Residual THPS', color: RESIDUAL_COLOR, shape: 'rect' },
  ];

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
  sectionResidualOk(column: BacheColumn): boolean | null {
    const values = column.samples.map((s) => s.thpsPercent).filter((v): v is number => v != null);
    if (!values.length) return null;
    return values.every((v) => v <= this.RESIDUAL_MIN);
  }

  private buildBacheLineData(column: BacheColumn): { labels: string[][]; datasets: unknown[] } {
    const keys = Object.keys(SCATTER_SERIES) as MicroVariableKey[];

    const datasets = keys.map((key) => {
      const cfg = SCATTER_SERIES[key];
      return {
        label: cfg.label,
        data: column.samples.map((s) => s.logs[key]),
        borderColor: cfg.color,
        backgroundColor: cfg.color,
        pointBackgroundColor: cfg.color,
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
      borderColor: THRESHOLD_COLOR,
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
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1f3a52',
          padding: 10,
          titleColor: '#ffffff',
          bodyColor: '#ffffff',
          borderColor: '#2a4f6b',
          borderWidth: 1,
          cornerRadius: 6,
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
          ticks: { color: '#6b7a99', font: { size: 9 }, autoSkip: false, maxRotation: 0 },
        },
        y: {
          min: 0,
          max: 6,
          grid: { color: '#eef2f7' },
          title: {
            display: showAxis,
            text: 'log10 (Bact/mL)',
            color: '#6b7a99',
            font: { size: 11 },
          },
          ticks: showAxis
            ? { stepSize: 1, color: '#6b7a99', font: { size: 11 } }
            : { display: false },
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
