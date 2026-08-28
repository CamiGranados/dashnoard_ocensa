import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { ChartModule } from 'primeng/chart';
import { SliderModule } from 'primeng/slider';
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
  border: string;
  /** Eje Y al que se ancla la serie. Por defecto 'y'; 'y1' para el eje secundario (Residual). */
  yAxisID?: string;
}

// TODO(usuario): título de eje Y y etiquetas de serie reales — unidades pendientes de confirmar.
const BAND1_Y_TITLE = 'Dosis(ppm)';
const BAND1_SERIES: BandSeriesConfig[] = [
  { key: 'dosisReal', label: 'Dosis Real', color: '#b8d3ef', border:'#83b2e3' },
  { key: 'dosisProgramada', label: 'Dosis Programada', color: '#f8c57c', border:'#f6b961' },
];

// Banda FWV: incluye Residual en un eje Y secundario (y1, %) — antes era una banda propia.
const BAND3_Y_TITLE = 'FWV (ppm)'; // TODO
const BAND3_Y1_TITLE = 'Residual (%)';
const BAND3_SERIES: BandSeriesConfig[] = [
  { key: 'fwvReportada', label: 'FWV Reportada', color: '#1c4463', border: '#1c4463' },
  { key: 'fwvEstimada', label: 'FWV Estimada', color: '#458ccc', border: '#458ccc' },
  { key: 'fwvCalculada', label: 'FWV Calculada', color: '#239a59', border: '#239a59' },
  { key: 'residualPct', label: 'Residual', color: '#447da2', border: '#447da2', yAxisID: 'y1' },
];

const BAND4_Y_TITLE = 'log₁₀(Bac/mL)';
const BAND4_SERIES: BandSeriesConfig[] = [
  { key: 'bant', label: 'BAnT', color: '#43474f', border: '#43474f' },
  { key: 'bht', label: 'BHT', color: '#239a59', border: '#239a59' },
  { key: 'bpa', label: 'BPA', color: '#e8590c', border: '#e8590c' },
  { key: 'bsr', label: 'BSR', color: '#1c4463', border: '#1c4463' },
];

const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function formatBandDate(timestamp: number): string {
  const d = new Date(timestamp);
  return `${d.getDate()} ${MESES_CORTOS[d.getMonth()]} ${d.getFullYear()}`;
}

const ALL_SERIES: BandSeriesConfig[] = [
  ...BAND1_SERIES,
  ...BAND3_SERIES,
  ...BAND4_SERIES,
];

const DEFAULT_SERIES_TYPE: Record<ChartSeriesKey, 'line' | 'bar'> = {
  dosisReal: 'bar',
  dosisProgramada: 'bar',
  residualPct: 'bar',
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

// Ancho FIJO de cada barra, en px. Con eje de tiempo lineal e intervalos irregulares (rachas de
// registros muy juntos y luego huecos largos), el dimensionado por porcentaje deja las barras
// minúsculas: Chart.js toma el menor hueco entre dos fechas como referencia de todo el ancho.
// Por eso lo fijamos. La separación entre barras contiguas la da el contorno de cada barra
// (cfg.border); si aún se confunden, baja BAR_THICKNESS o el windowSize (menos puntos = más aire).
const BAR_THICKNESS = 10;

function seriesHasData(rows: ThpsChartRow[], cfg: BandSeriesConfig): boolean {
  return rows.some((r) => r[cfg.key] != null);
}

// Dominio Y fijo sobre TODO el histórico. Al acotar el eje X a una ventana visible, Chart.js
// recalcula el rango del eje Y usando solo los puntos visibles, así que el eje "salta" al hacer
// scroll. Fijando min/max, el eje Y y sus etiquetas quedan estáticos (mismo criterio que
// corrosion / physicochemistry).
function yDomainOf(
  values: Array<number | null | undefined>,
  opts: { includeZero?: boolean; padFactor?: number } = {},
): { min?: number; max?: number } {
  const nums = values.filter((v): v is number => v != null && Number.isFinite(v));
  if (!nums.length) return {};
  const dataMin = Math.min(...nums);
  const dataMax = Math.max(...nums);
  const min = opts.includeZero ? Math.min(0, dataMin) : dataMin;
  const pad = (dataMax - min) * (opts.padFactor ?? 0.05) || Math.abs(dataMax) * 0.1 || 1;
  return { min: min === 0 ? 0 : min - pad, max: dataMax + pad };
}

function buildLinearDataset(rows: ThpsChartRow[], cfg: BandSeriesConfig, type: 'line' | 'bar') {
  const isBar = type === 'bar';
  return {
    type,
    label: cfg.label,
    // Barras: relleno claro (color) + contorno más oscuro (border) en los 4 lados.
    // Líneas: el trazo usa el color de borde (para líneas border === color).
    borderColor: cfg.border,
    backgroundColor: cfg.color,
    borderWidth: isBar ? 1.5 : 2,
    borderSkipped: isBar ? false : undefined,
    borderRadius: isBar ? 2 : undefined,
    pointRadius: isBar ? undefined : 2,
    pointHoverRadius: isBar ? undefined : 4,
    barThickness: isBar ? BAR_THICKNESS : undefined,
    tension: 0.25,
    spanGaps: true,
    yAxisID: cfg.yAxisID ?? 'y',
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
  position?: 'left' | 'right';
  color?: string;
}) {
  const position = opts.position ?? 'left';
  return {
    type: opts.type ?? 'linear',
    position,
    min: opts.min,
    max: opts.max,
    title: {
      display: !!opts.title,
      text: opts.title,
      color: opts.color ?? '#1c4463',
      font: { size: 12, weight: 700 as const },
    },
    ticks: { color: '#6b7a99', font: { size: 11 } },
    // El eje derecho (y1) no pinta su grid para no duplicar líneas sobre el del eje izquierdo.
    grid: { color: '#eef2f7', drawOnChartArea: position !== 'right' },
    afterFit: (scale: { width: number }) => {
      scale.width = 64;
    },
  };
}

// Eje Y derecho invisible: reserva los mismos 64px que el eje y1 real de la banda FWV para que
// chartArea.left/right sean idénticos en todas las bandas y el crosshair sincronizado caiga en la
// misma X. Ver la nota sobre chartArea.right en buildXScale.
function buildSpacerYScale() {
  return {
    type: 'linear' as const,
    position: 'right' as const,
    display: true,
    ticks: { display: false },
    title: { display: false },
    border: { display: false },
    grid: { display: false, drawOnChartArea: false, drawTicks: false },
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
  y1Scale: ReturnType<typeof buildYScale> | null = null,
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
    // y1: eje real (Residual) solo en la banda FWV; en el resto un espaciador del mismo ancho
    // para mantener alineado el chartArea entre bandas.
    scales: { x: xScale, y: yScale, y1: y1Scale ?? buildSpacerYScale() },
  };
}

@Component({
  selector: 'app-thps-tolerance',
  imports: [CommonModule, FormsModule, CardModule, TableModule, ChartModule, SliderModule, SelectButtonModule],
  templateUrl: './thps-tolerance.html',
  styleUrl: './thps-tolerance.css',
})
export class ThpsTolerance {
  private readonly thpsReviewService = inject(ThpsReviewService);

  readonly review = this.thpsReviewService.review;

  protected readonly band1Series = BAND1_SERIES;
  protected readonly band3Series = BAND3_SERIES;
  protected readonly band4Series = BAND4_SERIES;
  protected readonly band1Plugins = [crosshairSyncPlugin];
  protected readonly band3Plugins = [crosshairSyncPlugin, referenceLinePlugin];
  protected readonly band4Plugins = [crosshairSyncPlugin];
  protected readonly formatBandDate = formatBandDate;
  protected readonly chartTypeOptions = CHART_TYPE_OPTIONS;

  private readonly logZeroFloor = 1; // piso acordado: 0 real de bacterias se grafica en y=1 (log10=0)

  // ----------------------------- Ventana visible (scroll horizontal) -----------------------------
  // Las 3 bandas reciben SIEMPRE todo el histórico; el slider solo desplaza el rango de fechas
  // dibujado (scales.x.min/max), común a las 3. Los ejes Y tienen dominio fijo, así no se
  // reescalan al desplazar la ventana. Mismo criterio que la gráfica principal de physicochemistry.
  Math = Math;
  windowSize = 60;
  readonly sliderPosition = signal(0);
  readonly visibleRange = signal<[number, number]>([0, 0]);

  constructor() {
    // Al llegar datos nuevos (cambio de filtros) reencuadra la ventana en los últimos puntos.
    effect(() => {
      const total = this.sortedRows().length;
      if (total === 0) {
        this.visibleRange.set([0, 0]);
        this.sliderPosition.set(0);
        return;
      }
      const startIdx = Math.max(0, total - this.windowSize);
      this.sliderPosition.set(startIdx);
      this.visibleRange.set([startIdx, total - 1]);
    });
  }

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

  // Rango X dibujado = ventana visible (no todo el histórico), para que los puntos no se
  // amontonen. Mapea los índices de fila del slider a timestamps; común a las 3 bandas.
  readonly xDomain = computed(() => {
    const rows = this.sortedRows();
    if (!rows.length) return { min: 0, max: 0 };
    const lastIdx = rows.length - 1;
    const [start, end] = this.visibleRange();
    const s = Math.min(Math.max(start, 0), lastIdx);
    const e = Math.min(Math.max(end, s), lastIdx);
    return { min: rows[s].timestamp, max: rows[e].timestamp };
  });

  readonly band1Empty = computed(() => BAND1_SERIES.every((cfg) => !seriesHasData(this.sortedRows(), cfg)));
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

  // Tope del eje y1 (Residual, %) de la banda FWV: al menos 20 (límite contractual) + holgura.
  readonly band3Y1Max = computed(() => {
    const values = this.sortedRows()
      .map((r) => r.residualPct)
      .filter((v): v is number => v != null);
    const dataMax = values.length ? Math.max(...values) : 0;
    return Math.max(20, dataMax) * 1.1;
  });

  private bandValues(series: BandSeriesConfig[]): Array<number | null> {
    const rows = this.sortedRows();
    return series.flatMap((cfg) => rows.map((r) => r[cfg.key]));
  }

  // Dominios Y fijos sobre todo el histórico (ver nota en yDomainOf): mantienen estáticos los ejes
  // Y y sus etiquetas mientras el slider desplaza la ventana visible en X.
  readonly band1YDomain = computed(() =>
    yDomainOf(this.bandValues(BAND1_SERIES), { includeZero: true }),
  );

  readonly band3YDomain = computed(() =>
    yDomainOf(this.bandValues(BAND3_SERIES.filter((cfg) => (cfg.yAxisID ?? 'y') === 'y')), {
      includeZero: true,
    }),
  );

  // Eje log: 0 real se grafica en el piso logZeroFloor; el tope es el máx. histórico con holgura.
  readonly band4YMax = computed(() => {
    const vals = this.bandValues(BAND4_SERIES)
      .filter((v): v is number => v != null && Number.isFinite(v))
      .map((v) => (v === 0 ? this.logZeroFloor : v));
    return vals.length ? Math.max(...vals) * 1.5 : undefined;
  });

  readonly windowLabel = computed(() => {
    const rows = this.sortedRows();
    if (!rows.length) return '';
    const lastIdx = rows.length - 1;
    const [start, end] = this.visibleRange();
    const s = Math.min(Math.max(start, 0), lastIdx);
    const e = Math.min(Math.max(end, 0), lastIdx);
    return `${formatBandDate(rows[s].timestamp)} → ${formatBandDate(rows[e].timestamp)}`;
  });

  readonly band1Options = computed(() =>
    buildBandOptions(
      buildXScale(this.xDomain(), false),
      buildYScale({ title: BAND1_Y_TITLE, ...this.band1YDomain() }),
      (ts, x, y) => this.onBandHover(ts, x, y),
    ),
  );

  readonly band3Options = computed(() =>
    buildBandOptions(
      buildXScale(this.xDomain(), false),
      buildYScale({ title: BAND3_Y_TITLE, ...this.band3YDomain() }),
      (ts, x, y) => this.onBandHover(ts, x, y),
      { referenceLine: { value: 20, label: '20% (límite Residual)', scaleId: 'y1' } },
      buildYScale({
        title: BAND3_Y1_TITLE,
        position: 'right',
        min: 0,
        max: this.band3Y1Max(),
        color: '#447da2',
      }),
    ),
  );

  readonly band4Options = computed(() =>
    buildBandOptions(
      buildXScale(this.xDomain(), true),
      buildYScale({
        title: BAND4_Y_TITLE,
        type: 'logarithmic',
        min: this.logZeroFloor,
        max: this.band4YMax(),
      }),
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

  onSliderChange(newPosition: number): void {
    const lastIdx = Math.max(0, this.sortedRows().length - 1);
    const end = Math.min(newPosition + this.windowSize, lastIdx);
    this.visibleRange.set([newPosition, end]);
  }

  resetZoom(): void {
    const total = this.sortedRows().length;
    const startIdx = Math.max(0, total - this.windowSize);
    this.sliderPosition.set(startIdx);
    this.visibleRange.set([startIdx, Math.max(0, total - 1)]);
  }
}
