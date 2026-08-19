import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { ChartModule } from 'primeng/chart';
import { SelectButtonModule } from 'primeng/selectbutton';
import { ThpsReviewService } from '../../../../core/services/thps-review.service';
import { ThpsReviewRecord } from '../../../../core/models/thps-review.model';
import { ThpsChartRow, ThpsReviewMetricCard } from '../../../../core/models/thps-review.model';
import { crosshairSyncPlugin, referenceLinePlugin } from './thps-band-chart.plugins';


function toChartRow(r: ThpsReviewRecord): ThpsChartRow {
  return {
    timestamp: new Date(r.date).getTime(),
    dosisReal: r.realInjectedDose,
    dosisProgramada: r.scheduled_Dose,
    residualPct: r.residual_per,
    fwvReportada: r.reported_FWV,
    fwvEstimada: r.estimated_FWV,
    fwvCalculada: r.calculated_FWV,
    bant: r.bAntPlanct,
    bht: r.bhtPlanct,
    bpa: r.bpaPlanct,
    bsr: r.bsrPlanct,
  };
}

type ChartSeriesKey = Exclude<keyof ThpsChartRow, 'timestamp'>;

interface BandSeriesConfig {
  key: ChartSeriesKey;
  label: string;
  color: string;
}

// TODO(usuario): título de eje Y y etiquetas de serie reales — unidades pendientes de confirmar.
const BAND1_Y_TITLE = 'Dosis(ppm)';
const BAND1_SERIES: BandSeriesConfig[] = [
  { key: 'dosisReal', label: 'Dosis Real', color: '#1c4463' },
  { key: 'dosisProgramada', label: 'Dosis Programada', color: '#458ccc' },
];

const BAND2_Y_TITLE = 'Residual(%)';
const BAND2_SERIES: BandSeriesConfig[] = [
  { key: 'residualPct', label: 'Residual', color: '#447da2' },
];

const BAND3_Y_TITLE = 'FWV (ppm)'; // TODO
const BAND3_SERIES: BandSeriesConfig[] = [
  { key: 'fwvReportada', label: 'FWV Reportada', color: '#1c4463' },
  { key: 'fwvEstimada', label: 'FWV Estimada', color: '#458ccc' },
  { key: 'fwvCalculada', label: 'FWV Calculada', color: '#239a59' },
];

const BAND4_Y_TITLE = 'log₁₀(Bac/mL)';
const BAND4_SERIES: BandSeriesConfig[] = [
  { key: 'bant', label: 'BAnT', color: '#43474f' },
  { key: 'bht', label: 'BHT', color: '#239a59' },
  { key: 'bpa', label: 'BPA', color: '#e8590c' },
  { key: 'bsr', label: 'BSR', color: '#1c4463' },
];

const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function formatBandDate(timestamp: number): string {
  const d = new Date(timestamp);
  return `${d.getDate()} ${MESES_CORTOS[d.getMonth()]} ${d.getFullYear()}`;
}

const ALL_SERIES: BandSeriesConfig[] = [
  ...BAND1_SERIES,
  ...BAND2_SERIES,
  ...BAND3_SERIES,
  ...BAND4_SERIES,
];

const DEFAULT_SERIES_TYPE: Record<ChartSeriesKey, 'line' | 'bar'> = {
  dosisReal: 'bar',
  dosisProgramada: 'bar',
  residualPct: 'line',
  fwvReportada: 'line',
  fwvEstimada: 'line',
  fwvCalculada: 'line',
  bant: 'line',
  bht: 'line',
  bpa: 'line',
  bsr: 'line',
};

const CHART_TYPE_OPTIONS = [
  { label: 'Barras', value: 'bar' },
  { label: 'Línea', value: 'line' },
];

function seriesHasData(rows: ThpsChartRow[], cfg: BandSeriesConfig): boolean {
  return rows.some((r) => r[cfg.key] != null);
}

function buildLinearDataset(rows: ThpsChartRow[], cfg: BandSeriesConfig, type: 'line' | 'bar') {
  return {
    type,
    label: cfg.label,
    borderColor: cfg.color,
    backgroundColor: cfg.color,
    borderWidth: type === 'line' ? 2 : 0,
    pointRadius: type === 'line' ? 2 : undefined,
    pointHoverRadius: type === 'line' ? 4 : undefined,
    barThickness: type === 'bar' ? 8 : undefined,
    tension: 0.25,
    spanGaps: true,
    data: rows.map((r) => ({ x: r.timestamp, y: r[cfg.key] })),
  };
}

// Escala log10: 0 real (bacteria no detectada) no es graficable (log(0) indefinido). Se sustituye SOLO
// el punto y por el piso acordado (1 CFU/mL, límite de detección estándar); el valor real se conserva
// intacto en ThpsChartRow/sortedRows para el tooltip.
function buildLogDataset(rows: ThpsChartRow[], cfg: BandSeriesConfig, floor: number, type: 'line' | 'bar') {
  return {
    ...buildLinearDataset(rows, cfg, type),
    data: rows.map((r) => {
      const raw = r[cfg.key];
      return { x: r.timestamp, y: raw == null ? null : raw === 0 ? floor : raw };
    }),
  };
}

function buildXScale(domain: { min: number; max: number }, showTicks: boolean) {
  return {
    type: 'linear' as const,
    min: domain.min,
    max: domain.max,
    // 'data' (no 'ticks', el default): evita que Chart.js expanda el rango al step de tick más
    // cercano. Ese "nice rounding" varía según cuántos ticks caben por banda y desalinea el
    // chartArea.right entre bandas aunque min/max y chartArea.left ya coincidan.
    bounds: 'data' as const,
    ticks: {
      display: showTicks,
      color: '#6b7a99',
      font: { size: 11 },
      maxRotation: 0,
      autoSkip: true,
      callback: (value: number | string) => formatBandDate(Number(value)),
    },
    grid: { display: false },
  };
}

function buildYScale(opts: {
  title: string;
  type?: 'linear' | 'logarithmic';
  min?: number;
  max?: number;
}) {
  return {
    type: opts.type ?? 'linear',
    min: opts.min,
    max: opts.max,
    title: {
      display: !!opts.title,
      text: opts.title,
      color: '#1c4463',
      font: { size: 12, weight: 700 as const },
    },
    ticks: { color: '#6b7a99', font: { size: 11 } },
    grid: { color: '#eef2f7' },
    afterFit: (scale: { width: number }) => {
      scale.width = 64;
    },
  };
}

function buildBandOptions(
  xScale: ReturnType<typeof buildXScale>,
  yScale: ReturnType<typeof buildYScale>,
  onHover: (timestamp: number | null, x: number, y: number) => void,
  extraPlugins: Record<string, unknown> = {},
) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: { boxWidth: 10, boxHeight: 10, color: '#43474f', font: { size: 11 } },
      },
      tooltip: { enabled: false },
      crosshairSync: { groupId: 'thps-bands', onHover },
      ...extraPlugins,
    },
    scales: { x: xScale, y: yScale },
  };
}

@Component({
  selector: 'app-thps-tolerance',
  imports: [CommonModule, FormsModule, CardModule, TableModule, ChartModule, SelectButtonModule],
  templateUrl: './thps-tolerance.html',
  styleUrl: './thps-tolerance.css',
})
export class ThpsTolerance {
  private readonly thpsReviewService = inject(ThpsReviewService);

  readonly review = this.thpsReviewService.review;

  protected readonly band1Series = BAND1_SERIES;
  protected readonly band2Series = BAND2_SERIES;
  protected readonly band3Series = BAND3_SERIES;
  protected readonly band4Series = BAND4_SERIES;
  protected readonly band1Plugins = [crosshairSyncPlugin];
  protected readonly band2Plugins = [crosshairSyncPlugin, referenceLinePlugin];
  protected readonly band3Plugins = [crosshairSyncPlugin];
  protected readonly band4Plugins = [crosshairSyncPlugin];
  protected readonly formatBandDate = formatBandDate;
  protected readonly chartTypeOptions = CHART_TYPE_OPTIONS;

  private readonly logZeroFloor = 1; // piso acordado: 0 real de bacterias se grafica en y=1 (log10=0)

  // Control de tipo de gráfica (línea/barra) y visibilidad por serie, igual que en corrosion
  readonly seriesTypes = signal<Record<ChartSeriesKey, 'line' | 'bar'>>({ ...DEFAULT_SERIES_TYPE });

  readonly visibleSeries = signal<Record<ChartSeriesKey, boolean>>(
    ALL_SERIES.reduce((acc, cfg) => {
      acc[cfg.key] = true;
      return acc;
    }, {} as Record<ChartSeriesKey, boolean>),
  );

  toggleSeriesType(key: ChartSeriesKey, newType: 'line' | 'bar'): void {
    this.seriesTypes.set({ ...this.seriesTypes(), [key]: newType });
  }

  toggleSeriesVisibility(key: ChartSeriesKey): void {
    const current = this.visibleSeries();
    this.visibleSeries.set({ ...current, [key]: !current[key] });
  }

  readonly metrics = computed<ThpsReviewMetricCard[]>(() => {
    const summary = this.review.value()?.summary;
    if (!summary) return [];
    return [
      {
        title: 'THPS residual (mediana)',
        value: summary.residualMedian,
        unit: ' ppm',
        icon: 'pi pi-shield',
        color: 'info',
      },
      {
        title: 'Dosis efectiva (mediana)',
        value: summary.effectiveDoseMedian,
        unit: ' ppm',
        icon: 'pi pi-syringe',
        color: 'success',
      },
      {
        title: 'Retención (mediana)',
        value: summary.retentionMedian,
        unit: ' %',
        icon: 'pi pi-percentage',
        color: 'warning',
      },
      {
        title: 'Eventos con dosis real',
        value: summary.eventsWithRealDoseCount,
        unit: ` / ${summary.totalRecords}`,
        icon: 'pi pi-check-circle',
        color: 'danger',
      },
    ];
  });

  readonly records = computed(() => this.review.value()?.data ?? []);
  readonly totalRecords = computed(() => this.review.value()?.data.length ?? 0);

  readonly sortedRows = computed<ThpsChartRow[]>(() =>
    (this.review.value()?.data ?? [])
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(toChartRow),
  );

  readonly hasChartData = computed(() => this.sortedRows().length > 0);

  readonly xDomain = computed(() => {
    const rows = this.sortedRows();
    return { min: rows[0]?.timestamp ?? 0, max: rows[rows.length - 1]?.timestamp ?? 0 };
  });

  readonly band1Empty = computed(() => BAND1_SERIES.every((cfg) => !seriesHasData(this.sortedRows(), cfg)));
  readonly band2Empty = computed(() => BAND2_SERIES.every((cfg) => !seriesHasData(this.sortedRows(), cfg)));
  readonly band3Empty = computed(() => BAND3_SERIES.every((cfg) => !seriesHasData(this.sortedRows(), cfg)));
  readonly band4Empty = computed(() => BAND4_SERIES.every((cfg) => !seriesHasData(this.sortedRows(), cfg)));

  readonly band1Data = computed(() => {
    const rows = this.sortedRows();
    const visible = this.visibleSeries();
    const types = this.seriesTypes();
    return {
      datasets: BAND1_SERIES.filter((cfg) => visible[cfg.key] && seriesHasData(rows, cfg)).map((cfg) =>
        buildLinearDataset(rows, cfg, types[cfg.key]),
      ),
    };
  });

  readonly band2Data = computed(() => {
    const rows = this.sortedRows();
    const visible = this.visibleSeries();
    const types = this.seriesTypes();
    return {
      datasets: BAND2_SERIES.filter((cfg) => visible[cfg.key] && seriesHasData(rows, cfg)).map((cfg) =>
        buildLinearDataset(rows, cfg, types[cfg.key]),
      ),
    };
  });

  readonly band3Data = computed(() => {
    const rows = this.sortedRows();
    const visible = this.visibleSeries();
    const types = this.seriesTypes();
    return {
      datasets: BAND3_SERIES.filter((cfg) => visible[cfg.key] && seriesHasData(rows, cfg)).map((cfg) =>
        buildLinearDataset(rows, cfg, types[cfg.key]),
      ),
    };
  });

  readonly band4Data = computed(() => {
    const rows = this.sortedRows();
    const visible = this.visibleSeries();
    const types = this.seriesTypes();
    return {
      datasets: BAND4_SERIES.filter((cfg) => visible[cfg.key] && seriesHasData(rows, cfg)).map((cfg) =>
        buildLogDataset(rows, cfg, this.logZeroFloor, types[cfg.key]),
      ),
    };
  });

  readonly band2YMax = computed(() => {
    const values = this.sortedRows()
      .map((r) => r.residualPct)
      .filter((v): v is number => v != null);
    const dataMax = values.length ? Math.max(...values) : 0;
    return Math.max(20, dataMax) * 1.1;
  });

  readonly band1Options = computed(() =>
    buildBandOptions(buildXScale(this.xDomain(), false), buildYScale({ title: BAND1_Y_TITLE }), (ts, x, y) =>
      this.onBandHover(ts, x, y),
    ),
  );

  readonly band2Options = computed(() =>
    buildBandOptions(
      buildXScale(this.xDomain(), false),
      buildYScale({ title: BAND2_Y_TITLE, min: 0, max: this.band2YMax() }),
      (ts, x, y) => this.onBandHover(ts, x, y),
      { referenceLine: { value: 20, label: '20% (límite contractual)' } },
    ),
  );

  readonly band3Options = computed(() =>
    buildBandOptions(buildXScale(this.xDomain(), false), buildYScale({ title: BAND3_Y_TITLE }), (ts, x, y) =>
      this.onBandHover(ts, x, y),
    ),
  );

  readonly band4Options = computed(() =>
    buildBandOptions(
      buildXScale(this.xDomain(), true),
      buildYScale({ title: BAND4_Y_TITLE, type: 'logarithmic', min: this.logZeroFloor }),
      (ts, x, y) => this.onBandHover(ts, x, y),
    ),
  );

  readonly hoveredTimestamp = signal<number | null>(null);
  readonly hoveredPixel = signal<{ x: number; y: number }>({ x: 0, y: 0 });

  readonly hoveredRow = computed<ThpsChartRow | null>(() => {
    const ts = this.hoveredTimestamp();
    const rows = this.sortedRows();
    if (ts == null || !rows.length) return null;
    return rows.reduce((closest, r) =>
      Math.abs(r.timestamp - ts) < Math.abs(closest.timestamp - ts) ? r : closest,
    );
  });

  onBandHover(timestamp: number | null, x: number, y: number): void {
    this.hoveredTimestamp.set(timestamp);
    this.hoveredPixel.set({ x, y });
  }
}
