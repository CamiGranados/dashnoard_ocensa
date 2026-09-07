import {
  afterEveryRender,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  signal,
  untracked,
  viewChild,
  viewChildren,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { ChartModule, UIChart } from 'primeng/chart';
import { SliderModule } from 'primeng/slider';
import { SelectButtonModule } from 'primeng/selectbutton';
import type { Chart } from 'chart.js';
import { ThpsReviewService } from '../../../../core/services/thps-review.service';
import { ThpsReviewRecord } from '../../../../core/models/thps-review.model';
import { ThpsChartRow, ThpsReviewMetricCard } from '../../../../core/models/thps-review.model';
import { KpiCard } from '../../../../shared/components/kpi-card/kpi-card';
import { crosshairSyncPlugin, referenceLinePlugin } from './thps-band-chart.plugins';
import { MESES } from '../../../../shared/charts/chart-dates';
import { chartToken, FWV_TOKEN, PLANCTONICA_TOKEN } from '../../../../shared/charts/chart-tokens';
import { applyChartDefaults } from '../../../../shared/charts/chart-defaults';
import { createWindowState } from '../../../../shared/charts/window-state';
import { createSeriesToggles, CHART_TYPE_OPTIONS } from '../../../../shared/charts/series-toggles';
import { lineOrBarDataset } from '../../../../shared/charts/chart-datasets';
import { ChartToolbar } from '../../../../shared/charts/chart-toolbar/chart-toolbar';
import { ChartInteractionMode } from '../../../../shared/charts/chart-view-state';
import { buildZoomOptions, stepZoom } from '../../../../shared/charts/chart-zoom';
import { setRefLinesHidden } from '../../../../shared/charts/chart-reference-lines';
import {
  buildChartFileName,
  copyPngToClipboard,
  downloadDataUrl,
  downloadText,
  matrixToCsv,
  stackChartsToPng,
} from '../../../../shared/charts/chart-export';


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
  /** Nombres de token (chart-tokens.css); se resuelven con chartToken(). Para líneas
   *  trazo === relleno; para barras `color` es el relleno claro y `border` el contorno. */
  color: string;
  border: string;
  /** Eje Y al que se ancla la serie. Por defecto 'y'; 'y1' para el eje secundario (Residual). */
  yAxisID?: string;
}

// TODO(usuario): título de eje Y y etiquetas de serie reales — unidades pendientes de confirmar.
const BAND1_Y_TITLE = 'Dosis(ppm)';
const BAND1_SERIES: BandSeriesConfig[] = [
  { key: 'dosisReal', label: 'Dosis Real', color: '--chart-dosis-real-fill', border: '--chart-dosis-real' },
  { key: 'dosisProgramada', label: 'Dosis Programada', color: '--chart-dosis-programada-fill', border: '--chart-dosis-programada' },
];

// Banda FWV: incluye Residual en un eje Y secundario (y1, %) — antes era una banda propia.
const BAND3_Y_TITLE = 'FWV (ppm)'; // TODO
const BAND3_Y1_TITLE = 'Residual (%)';
const BAND3_SERIES: BandSeriesConfig[] = [
  { key: 'fwvReportada', label: 'FWV Reportada', color: FWV_TOKEN.reportada, border: FWV_TOKEN.reportada },
  { key: 'fwvEstimada', label: 'FWV Estimada', color: FWV_TOKEN.estimada, border: FWV_TOKEN.estimada },
  { key: 'fwvCalculada', label: 'FWV Calculada', color: FWV_TOKEN.calculada, border: FWV_TOKEN.calculada },
  { key: 'residualPct', label: 'Residual', color: '--chart-residual', border: '--chart-residual', yAxisID: 'y1' },
];

const BAND4_Y_TITLE = 'log₁₀(Bac/mL)';
const BAND4_SERIES: BandSeriesConfig[] = [
  { key: 'bant', label: 'BAnT', color: PLANCTONICA_TOKEN.bant, border: PLANCTONICA_TOKEN.bant },
  { key: 'bht', label: 'BHT', color: PLANCTONICA_TOKEN.bht, border: PLANCTONICA_TOKEN.bht },
  { key: 'bpa', label: 'BPA', color: PLANCTONICA_TOKEN.bpa, border: PLANCTONICA_TOKEN.bpa },
  { key: 'bsr', label: 'BSR', color: PLANCTONICA_TOKEN.bsr, border: PLANCTONICA_TOKEN.bsr },
];

// Recibe un timestamp local (ver toChartRow). El swap a isoToLocalTimestamp está
// pendiente de confirmar el formato del campo `date` del backend.
function formatBandDate(timestamp: number): string {
  const d = new Date(timestamp);
  return `${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}`;
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
  // Barras: relleno claro (color) + contorno más oscuro (border) en los 4 lados.
  // Líneas: el trazo usa el color de borde (para líneas border === color).
  return lineOrBarDataset({
    label: cfg.label,
    type,
    stroke: chartToken(cfg.border),
    fill: chartToken(cfg.color),
    yAxisID: cfg.yAxisID ?? 'y',
    barThickness: BAR_THICKNESS,
    barBorderWidth: 1.5,
    barBorderRadius: 2,
    data: rows.map((r) => ({ x: r.timestamp, y: r[cfg.key] })),
  });
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
    // Color y tamaño de tick -> Chart.defaults (chart-defaults.ts).
    ticks: {
      display: showTicks,
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
    // El título de eje va en azul oscuro (más contraste que el gris de los ticks, que hereda
    // Chart.defaults). Color y tamaño de tick + color de grid -> Chart.defaults.
    title: {
      display: !!opts.title,
      text: opts.title,
      color: opts.color ?? chartToken('--chart-axis-title'),
      font: { size: 12, weight: 700 as const },
    },
    // El eje derecho (y1) no pinta su grid para no duplicar líneas sobre el del eje izquierdo.
    grid: { drawOnChartArea: position !== 'right' },
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
        labels: {
          boxWidth: 10,
          boxHeight: 10,
          color: chartToken('--color-gray-dark'),
          font: { size: 11 },
        },
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

// Las 3 bandas comparten estructura (cabecera + controles de serie + <p-chart> con crosshair
// sincronizado); sólo cambian estas piezas. No hay band2: la antigua banda Residual se fusionó
// en band3 como eje y1 (ver comentario junto a BAND3_SERIES).
interface ThpsBandDef {
  id: 'band1' | 'band3' | 'band4';
  heading: string;
  chartType: 'line' | 'bar';
  series: BandSeriesConfig[];
  /** band4: escala logarítmica y sustitución de 0 por el piso de detección. */
  log: boolean;
}

const BAND_DEFS: ThpsBandDef[] = [
  { id: 'band1', heading: 'Aplicación de Dosis Biocida', chartType: 'bar', series: BAND1_SERIES, log: false },
  { id: 'band3', heading: 'FWV y Residual', chartType: 'line', series: BAND3_SERIES, log: false },
  { id: 'band4', heading: 'Respuesta microbiológica', chartType: 'line', series: BAND4_SERIES, log: true },
];

interface ThpsBand extends ThpsBandDef {
  empty: boolean;
  data: { datasets: unknown[] };
  options: ReturnType<typeof buildBandOptions>;
  plugins: unknown[];
  last: boolean;
}

@Component({
  selector: 'app-thps-tolerance',
  imports: [CommonModule, FormsModule, CardModule, TableModule, ChartModule, SliderModule, SelectButtonModule, KpiCard, ChartToolbar],
  templateUrl: './thps-tolerance.html',
  styleUrl: './thps-tolerance.css',
  host: {
    '(document:keydown.escape)': 'onEscape()',
  },
})
export class ThpsTolerance {
  private readonly thpsReviewService = inject(ThpsReviewService);

  readonly review = this.thpsReviewService.review;

  // Todas las series (band1 + band3 + band4) para el tooltip HTML del crosshair.
  protected readonly allSeries = ALL_SERIES;
  protected readonly formatBandDate = formatBandDate;

  private readonly logZeroFloor = 1; // piso acordado: 0 real de bacterias se grafica en y=1 (log10=0)

  // ----------------------------- Ventana visible (scroll horizontal) -----------------------------
  // Las 3 bandas reciben SIEMPRE todo el histórico; el slider solo desplaza el rango de fechas
  // dibujado (scales.x.min/max), común a las 3. Los ejes Y tienen dominio fijo, así no se
  // reescalan al desplazar la ventana. Mismo criterio que la gráfica principal de physicochemistry.
  Math = Math;

  // Ventana visible y toggles de serie (tipo + visibilidad): estado compartido en shared/charts.
  // Los toggles son ÚNICOS para las 3 bandas (ALL_SERIES cubre band1 + band3 + band4).
  protected readonly window = createWindowState(computed(() => this.sortedRows().length));
  protected readonly toggles = createSeriesToggles<ChartSeriesKey>(DEFAULT_SERIES_TYPE);
  protected readonly chartTypeOptions = CHART_TYPE_OPTIONS;
  // Resuelve tokens de color en el template (swatches de series y del tooltip de crosshair).
  protected readonly chartToken = chartToken;

  // ----------------------------- Barra de herramientas (una sola para las 3 bandas) -----------------------------
  // Las 3 bandas comparten crosshair + slider de ventana + toggles, así que una barra por banda
  // rompería la sincronización: una sola barra sobre las 3. El zoom/pan del plugin actúa sobre
  // el eje X de las 3 a la vez (comparten dominio temporal); el slider sigue siendo la
  // navegación "gruesa" del histórico.
  protected readonly bandCharts = viewChildren(UIChart);
  private readonly tablePanel = viewChild<ElementRef<HTMLElement>>('tablePanel');
  protected readonly expanded = signal(false);
  protected readonly refLinesVisible = signal(true);
  protected readonly copyFeedback = signal<'ok' | 'error' | null>(null);

  // Modo de interacción (pan/selección) y estado de zoom, común a las 3 bandas.
  protected readonly bandMode = signal<ChartInteractionMode>('pan');
  protected readonly bandZoomLevel = signal(1);
  protected readonly canZoomIn = computed(() => this.bandZoomLevel() < 10);
  protected readonly canZoomOut = computed(() => this.bandZoomLevel() > 1.01);
  private readonly bandZoomBounds = signal<readonly [number, number] | null>(null);
  private readonly configuredBands = new WeakMap<Chart, ChartInteractionMode>();
  private syncingZoom = false;

  protected readonly bandsSubtitle = computed(() => {
    const rows = this.sortedRows();
    if (rows.length < 2) return 'Dosis, FWV/residual y respuesta microbiológica';
    return `Dosis, FWV/residual y microbiología · ${formatBandDate(rows[0].timestamp)} – ${formatBandDate(rows[rows.length - 1].timestamp)}`;
  });

  constructor() {
    applyChartDefaults();

    // Inyecta la config de zoom en cada banda viva (imperativo, no vía `options` nuevas, para
    // no reinicializar los `<p-chart>` al cambiar de modo). Re-aplica el rango de zoom
    // persistido cuando `bands()` recrea una gráfica (mover slider, toggles, datos nuevos).
    afterEveryRender(() => {
      const mode = this.bandMode();
      const bounds = this.bandZoomBounds();
      for (const c of this.liveCharts()) {
        if (this.configuredBands.get(c) === mode) continue;
        this.configuredBands.set(c, mode);
        (c.options.plugins ??= {}).zoom = buildZoomOptions({
          mode,
          axisMode: 'x',
          onZoomComplete: (src) => this.syncBandZoom(src),
          onPanComplete: (src) => this.syncBandZoom(src),
        });
        if (bounds) c.zoomScale('x', { min: bounds[0], max: bounds[1] }, 'none');
        c.update('none');
      }
    });

    // Mover el slider de ventana = navegar el histórico ⇒ el zoom fino se descarta.
    effect(() => {
      this.window.range();
      untracked(() => {
        if (this.bandZoomBounds() !== null) this.bandZoomBounds.set(null);
        if (this.bandZoomLevel() !== 1) this.bandZoomLevel.set(1);
      });
    });
  }

  /** Instancias Chart.js de las 3 bandas (las pintadas). */
  private liveCharts(): Chart[] {
    return this.bandCharts()
      .map((ui) => ui.chart as (Chart & { ctx?: unknown }) | undefined)
      .filter((c): c is Chart => !!c?.ctx);
  }

  /** Al hacer zoom/pan en una banda, aplica el mismo rango X a las otras dos. */
  private syncBandZoom(source: Chart): void {
    if (this.syncingZoom) return;
    this.syncingZoom = true;
    const x = source.getZoomedScaleBounds()['x'];
    this.bandZoomBounds.set(x ? [x.min, x.max] : null);
    this.bandZoomLevel.set(source.getZoomLevel());
    for (const c of this.liveCharts()) {
      if (c === source) continue;
      if (x) c.zoomScale('x', { min: x.min, max: x.max }, 'none');
      else c.resetZoom('none');
    }
    this.syncingZoom = false;
  }

  protected onZoomBands(direction: 'in' | 'out'): void {
    const [first] = this.liveCharts();
    if (!first) return;
    stepZoom(first, direction);
    // `onZoomComplete` no se dispara para el zoom programático (sólo rueda/arrastre) → sincronizar a mano.
    this.syncBandZoom(first);
  }

  protected onBandModeChange(mode: ChartInteractionMode): void {
    this.bandMode.set(mode);
  }

  protected onResetBands(): void {
    this.bandMode.set('pan');
    this.bandZoomBounds.set(null);
    this.bandZoomLevel.set(1);
    this.syncingZoom = true;
    for (const c of this.liveCharts()) c.resetZoom('none');
    this.syncingZoom = false;
    this.window.reset();
  }

  protected onDownloadBands(kind: 'png' | 'csv'): void {
    const charts = this.liveCharts();
    const base = charts.length
      ? buildChartFileName('thps-series', charts[0])
      : 'thps-series';
    if (kind === 'csv') {
      downloadText(this.buildCsv(), `${base}.csv`);
      return;
    }
    if (!charts.length) return;
    downloadDataUrl(stackChartsToPng(charts, this.pngHeader()), `${base}.png`);
  }

  protected onExpandToggle(): void {
    this.expanded.update((v) => !v);
    requestAnimationFrame(() => this.liveCharts().forEach((c) => c.resize()));
  }

  protected onEscape(): void {
    if (this.expanded()) this.expanded.set(false);
  }

  protected onToggleRefLines(): void {
    this.refLinesVisible.update((v) => !v);
    const hidden = !this.refLinesVisible();
    for (const c of this.liveCharts()) {
      setRefLinesHidden(c, hidden);
      c.update('none');
    }
  }

  protected onShowData(): void {
    this.tablePanel()?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  protected async onCopyImage(): Promise<void> {
    const charts = this.liveCharts();
    if (!charts.length) return;
    try {
      await copyPngToClipboard(stackChartsToPng(charts, this.pngHeader()));
      this.copyFeedback.set('ok');
    } catch {
      this.copyFeedback.set('error');
    }
    setTimeout(() => this.copyFeedback.set(null), 2500);
  }

  private pngHeader(): { title: string; subtitle?: string } {
    return { title: 'Tolerancia THPS · series sincronizadas', subtitle: this.bandsSubtitle() };
  }

  /** CSV combinado de las 3 bandas: una fila por registro con todas las series. */
  private buildCsv(): string {
    const headers = ['Fecha', ...ALL_SERIES.map((s) => s.label)];
    const rows = this.sortedRows().map((r) => [
      new Date(r.timestamp).toISOString().slice(0, 10),
      ...ALL_SERIES.map((s) => r[s.key] ?? null),
    ]);
    return matrixToCsv([headers, ...rows]);
  }

  readonly metrics = computed<ThpsReviewMetricCard[]>(() => {
    const summary = this.review.value()?.summary;
    if (!summary) return [];
    return [
      {
        title: 'THPS residual (mediana)',
        value: summary.residualMedian,
        unit: 'ppm',
        subtitle: 'Mediana del periodo filtrado',
        icon: 'fa-solid fa-jar',
        color: 'info',
      },
      {
        title: 'Dosis efectiva (mediana)',
        value: summary.effectiveDoseMedian,
        unit: 'ppm',
        subtitle: 'Mediana del periodo filtrado',
        icon: 'fa-solid fa-syringe',
        color: 'success',
      },
      {
        title: 'Retención (mediana)',
        value: summary.retentionMedian,
        unit: '%',
        subtitle: 'Referencia contractual: ≥ 20 %',
        icon: 'fa-solid fa-chart-line',
        color: 'warning',
      },
      {
        title: 'Eventos con dosis real',
        value: summary.eventsWithRealDoseCount,
        unit: `/ ${summary.totalRecords}`,
        subtitle: 'Registros con dosis inyectada medida',
        icon: 'fa-regular fa-calendar-check',
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
    const [start, end] = this.window.range();
    const s = Math.min(Math.max(start, 0), lastIdx);
    const e = Math.min(Math.max(end, s), lastIdx);
    return { min: rows[s].timestamp, max: rows[e].timestamp };
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
    const [start, end] = this.window.range();
    const s = Math.min(Math.max(start, 0), lastIdx);
    const e = Math.min(Math.max(end, 0), lastIdx);
    return `${formatBandDate(rows[s].timestamp)} → ${formatBandDate(rows[e].timestamp)}`;
  });

  // Las 3 bandas en un solo computed: misma estructura, recorrida con @for en el template.
  // Cada banda conserva su dominio Y propio (band1/band3 padding proporcional, band4 log10) y
  // band3 su eje y1 (Residual) + línea de referencia del 20%.
  readonly bands = computed<ThpsBand[]>(() => {
    const rows = this.sortedRows();
    const visible = this.toggles.visible();
    const types = this.toggles.types();
    const xDomain = this.xDomain();
    const onHover = (ts: number | null, x: number, y: number) => this.onBandHover(ts, x, y);

    return BAND_DEFS.map((def) => {
      const datasets = def.series
        .filter((cfg) => visible[cfg.key] && seriesHasData(rows, cfg))
        .map((cfg) =>
          def.log
            ? buildLogDataset(rows, cfg, this.logZeroFloor, types[cfg.key])
            : buildLinearDataset(rows, cfg, types[cfg.key]),
        );

      // Sólo band4 (la última) pinta los ticks del eje X; las demás alinean su chartArea con ella.
      // Un xScale nuevo por banda: Chart.js muta la config de escala por instancia.
      const xScale = buildXScale(xDomain, def.id === 'band4');

      let options: ReturnType<typeof buildBandOptions>;
      if (def.id === 'band1') {
        options = buildBandOptions(
          xScale,
          buildYScale({ title: BAND1_Y_TITLE, ...this.band1YDomain() }),
          onHover,
        );
      } else if (def.id === 'band3') {
        options = buildBandOptions(
          xScale,
          buildYScale({ title: BAND3_Y_TITLE, ...this.band3YDomain() }),
          onHover,
          { referenceLine: { value: 20, label: '20% (límite Residual)', scaleId: 'y1' } },
          buildYScale({
            title: BAND3_Y1_TITLE,
            position: 'right',
            min: 0,
            max: this.band3Y1Max(),
            color: chartToken('--chart-residual'),
          }),
        );
      } else {
        options = buildBandOptions(
          xScale,
          buildYScale({
            title: BAND4_Y_TITLE,
            type: 'logarithmic',
            min: this.logZeroFloor,
            max: this.band4YMax(),
          }),
          onHover,
        );
      }

      return {
        ...def,
        last: def.id === 'band4',
        empty: def.series.every((cfg) => !seriesHasData(rows, cfg)),
        data: { datasets },
        options,
        plugins:
          def.id === 'band3'
            ? [crosshairSyncPlugin, referenceLinePlugin]
            : [crosshairSyncPlugin],
      };
    });
  });

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
