import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ChartModule } from 'primeng/chart';
import { SliderModule } from 'primeng/slider';
import { SelectButtonModule } from 'primeng/selectbutton';
import { PhysicochemistryService } from '../../../../core/services/physicochemistry.service';
import { PhysicalChemistryRecord } from '../../../../core/models/physicochemistry.model';
import { limitLinesPlugin } from './physicochemistry-limit-line.plugin';
import { MESES } from '../../../../shared/charts/chart-dates';
import { chartToken } from '../../../../shared/charts/chart-tokens';
import { applyChartDefaults } from '../../../../shared/charts/chart-defaults';
import { createWindowState } from '../../../../shared/charts/window-state';
import { createSeriesToggles, CHART_TYPE_OPTIONS } from '../../../../shared/charts/series-toggles';
import { ChartFrame } from '../../../../shared/charts/chart-frame/chart-frame';

type SeriesKey =
  | 'generalCorrosionRate'
  | 'corrosionRateMean'
  | 'maximumStingSpeed'
  | 'maximumStingMean';

// `color` / `fill` guardan el NOMBRE del token (chart-tokens.css); se resuelven con chartToken().
const SERIES_CONFIG: Record<SeriesKey, {
  label: string;
  axis: 'y' | 'y1';
  defaultType: 'line' | 'bar';
  color: string;
  /**
   * Relleno translúcido bajo la línea. Su presencia marca la serie como "media": se dibuja
   * como área rellena con marcadores de círculo hueco (relleno blanco + borde de color),
   * igual que en la gráfica de referencia.
   */
  fill?: string;
}> = {
  generalCorrosionRate: { label: 'Tasa de corrosión general', axis: 'y', defaultType: 'line', color: '--chart-fq-corrosion-rate' },
  corrosionRateMean: { label: 'Media tasa de corrosión', axis: 'y', defaultType: 'line', color: '--chart-fq-corrosion-rate', fill: '--chart-fq-corrosion-rate-fill' },
  maximumStingSpeed: { label: 'Velocidad máxima de picadura', axis: 'y1', defaultType: 'line', color: '--chart-fq-pitting-speed' },
  maximumStingMean: { label: 'Media velocidad de picadura', axis: 'y1', defaultType: 'line', color: '--chart-fq-pitting-speed-mean', fill: '--chart-fq-pitting-speed-fill' },
};

type MiniSeriesKey = 'temperatureC' | 'h2S' | 'ph' | 'conductivity' | 'alkalinity' | 'calcium';

// TODO(usuario): límites provisionales — reemplazar por los rangos reales del proceso cuando se definan.
const MINI_SERIES_CONFIG: Record<MiniSeriesKey, {
  label: string;
  color: string;
  limits: { min: number; max: number };
}> = {
  temperatureC: { label: 'Temperatura (°C)', color: '--chart-fq-temperatura', limits: { min: 24, max: 32 } },
  h2S: { label: 'H2S', color: '--chart-fq-h2s', limits: { min: 0, max: 5 } },
  ph: { label: 'pH', color: '--chart-fq-ph', limits: { min: 0, max: 8.5 } },
  conductivity: { label: 'Conductividad', color: '--chart-fq-conductividad', limits: { min: 0, max: 3600 } },
  alkalinity: { label: 'Alcalinidad', color: '--chart-fq-alcalinidad', limits: { min: 45, max: 1200 } },
  calcium: { label: 'Calcio', color: '--chart-fq-calcio', limits: { min: 0, max: 700 } },
};

interface MiniChartCard {
  key: MiniSeriesKey;
  label: string;
  hasAlert: boolean;
  data: { labels: string[]; datasets: unknown[] };
  options: Record<string, unknown>;
  plugins: unknown[];
}

interface YearPage {
  startYear: number;
  endYear: number;
  start: number;
  end: number;
}

@Component({
  selector: 'app-physicochemistry',
  imports: [CommonModule, FormsModule, TableModule, ChartModule, SliderModule, SelectButtonModule, ChartFrame],
  templateUrl: './physicochemistry.html',
  styleUrl: './physicochemistry.css',
})
export class Physicochemistry {
  private readonly physicochemistryService = inject(PhysicochemistryService);

  readonly review = this.physicochemistryService.review;

  readonly records = computed(() => this.review.value()?.data ?? []);
  readonly totalRecords = computed(() => this.records().length);

  readonly sortedRecords = computed<PhysicalChemistryRecord[]>(() =>
    this.records().slice().sort((a, b) => a.date.localeCompare(b.date)),
  );

  // Subtítulo de la cabecera de la gráfica principal (patrón del contenedor común): rango de fechas.
  readonly mainSubtitle = computed(() => {
    const recs = this.sortedRecords();
    if (recs.length < 2) return 'Media móvil y valores por evento';
    return `Media móvil y valores por evento · ${this.formatMonthYear(recs[0].date)} – ${this.formatMonthYear(recs[recs.length - 1].date)}`;
  });

  // ----------------------------- Gráfica: tasa de corrosión / velocidad de picadura -----------------------------
  Math = Math;

  // Resuelve tokens de color en el template (swatch de la leyenda de series).
  protected readonly chartToken = chartToken;

  // Maquinaria A — ventana visible (slider) de la grilla de mini-variables + toggles de serie:
  // estado compartido en shared/charts. La gráfica PRINCIPAL usa su propia paginación por año
  // (maquinaria B: mainPages / mainPageIndex, más abajo).
  protected readonly window = createWindowState(computed(() => this.sortedRecords().length));
  protected readonly toggles = createSeriesToggles<SeriesKey>(
    Object.fromEntries(
      (Object.keys(SERIES_CONFIG) as SeriesKey[]).map((key) => [key, SERIES_CONFIG[key].defaultType]),
    ) as Record<SeriesKey, 'line' | 'bar'>,
  );
  protected readonly chartTypeOptions = CHART_TYPE_OPTIONS;

  constructor() {
    applyChartDefaults();

    // Maquinaria B: al llegar datos nuevos, la gráfica principal salta a la última página de año.
    effect(() => {
      const total = this.sortedRecords().length;
      this.mainPageIndex.set(total === 0 ? 0 : Math.max(0, this.mainPages().length - 1));
    });
  }

  // Ventana visible de la grilla de variables restantes (la gráfica principal ya no se recorta).
  readonly windowRecords = computed(() => {
    const records = this.sortedRecords();
    const [start, end] = this.window.range();
    return records.slice(start, end + 1);
  });

  readonly windowLabels = computed(() => this.windowRecords().map((r) => this.formatDate(r.date)));

  // La gráfica principal siempre recibe TODO el histórico con fechas reales en el eje X.
  // La ventana visible se paginan por año calendario: si los datos caben en 1 año se muestra
  // ese año completo (Ene-Dic); si abarcan más, se pagina de a 2 años (2025-2026, 2023-2024, …),
  // así siempre se ve un bloque de calendario completo en vez de aire vacío. El tamaño del
  // canvas, el eje Y y la leyenda nunca se mueven ni desaparecen al cambiar de página.
  readonly mainPages = computed<YearPage[]>(() => {
    const records = this.sortedRecords();
    if (!records.length) return [];

    const minYear = new Date(records[0].date).getFullYear();
    const maxYear = new Date(records[records.length - 1].date).getFullYear();
    const pageSizeYears = maxYear - minYear + 1 <= 1 ? 1 : 6;

    const pages: YearPage[] = [];
    let end = maxYear;
    while (end >= minYear) {
      const start = Math.max(minYear, end - pageSizeYears + 1);
      pages.push({
        startYear: start,
        endYear: end,
        start: new Date(start, 0, 2).getTime(),
        end: new Date(end + 1, 0, 1).getTime() - 1,
      });
      end = start - 1;
    }

    return pages.reverse(); // orden cronológico: índice 0 = página más antigua
  });

  mainPageIndex = signal(0);

  readonly mainPage = computed<YearPage | null>(() => {
    const pages = this.mainPages();
    return pages[this.mainPageIndex()] ?? pages[pages.length - 1] ?? null;
  });

  private static domainOf(values: number[]): { min: number; max: number } {
    if (!values.length) return { min: 0, max: 1 };
    const min = Math.min(...values);
    const max = Math.max(...values);
    const pad = (max - min) * 0.1 || 1;
    return { min: Math.max(0, min - pad), max: max + pad };
  }

  // Dominio fijo por serie, calculado una sola vez sobre TODO el histórico: así el eje Y no se
  // reescala (ni "salta") al desplazar la ventana visible.
  private readonly mainYDomain = computed(() =>
    Physicochemistry.domainOf(
      this.sortedRecords()
        .flatMap((r) => [r.generalCorrosionRate, r.corrosionRateMean])
        .filter((v): v is number => v != null),
    ),
  );

  private readonly mainY1Domain = computed(() =>
    Physicochemistry.domainOf(
      this.sortedRecords()
        .flatMap((r) => [r.maximumStingSpeed, r.maximumStingMean])
        .filter((v): v is number => v != null),
    ),
  );

  readonly chartData = computed(() => {
    const records = this.sortedRecords();
    const visible = this.toggles.visible();
    const types = this.toggles.types();

    if (!records.length) return { datasets: [] };

    const datasets = (Object.keys(SERIES_CONFIG) as SeriesKey[])
      .filter((key) => visible[key])
      .map((key) => {
        const cfg = SERIES_CONFIG[key];
        const currentType = types[key];
        const isBar = currentType === 'bar';
        // Serie "media": área rellena + marcadores de círculo hueco (ver SERIES_CONFIG.fill).
        const isMean = !isBar && !!cfg.fill;
        const color = chartToken(cfg.color);

        return {
          type: currentType,
          label: cfg.label,
          yAxisID: cfg.axis,
          borderColor: color,
          backgroundColor: isMean ? chartToken(cfg.fill ?? cfg.color) : color,
          fill: isMean ? 'origin' : false,
          order: isBar ? 999 : isMean ? 1 : 0,
          borderWidth: isBar ? 0 : 2.5,
          barThickness: isBar ? 8 : undefined,
          pointStyle: 'circle',
          pointRadius: isBar ? undefined : isMean ? 3.5 : 1,
          pointHoverRadius: isBar ? undefined : isMean ? 5 : 3,
          pointBackgroundColor: isMean ? chartToken('--color-white') : color,
          pointBorderColor: color,
          pointBorderWidth: isMean ? 2 : 1,
          tension: 0.3,
          spanGaps: true,
          data: records.map((r) => ({ x: new Date(r.date).getTime(), y: r[key] })),
        };
      });

    return { datasets };
  });

  readonly chartOptions = computed(() => {
    const yDomain = this.mainYDomain();
    const y1Domain = this.mainY1Domain();
    const page = this.mainPage();
    const viewStart = page?.start ?? 0;
    const viewEnd = page?.end ?? 0;

    return {
      responsive: true,
      animation: false as const,
      // Cromo (tooltip color, grid, ejes, maintainAspectRatio) -> Chart.defaults (chart-defaults.ts).
      // Interacción unificada: hover y tooltip resuelven SIEMPRE el mismo conjunto de puntos
      // (los del índice más cercano en X). Sin esto, el hover (modo `nearest` por defecto) y el
      // tooltip (`index`) apuntan a elementos distintos y aparecen dos cajas parpadeando.
      interaction: {
        mode: 'index' as const,
        intersect: false,
        axis: 'x' as const,
      },
      plugins: {
        legend: { position: 'top' as const },
        tooltip: {
          // Ancla la caja al punto más cercano en vez del promedio de puntos repartidos en los
          // dos ejes Y (que hacía "saltar" el tooltip y trababa la gráfica).
          position: 'nearest' as const,
          titleFont: { size: 14, weight: 'bold' },
          bodyFont: { size: 13 },
          displayColors: true,
          callbacks: {
            title: (items: Array<{ parsed: { x: number } }>) =>
              items[0] ? this.formatDate(items[0].parsed.x) : '',
          },
        },
      },
      scales: {
        x: {
          type: 'linear' as const,
          min: viewStart,
          max: viewEnd,
          bounds: 'data' as const,
          ticks: {
            callback: (value: number | string) => this.formatMonthYear(Number(value)),
            maxRotation: 0,
            autoSkip: true,
          },
        },
        y: {
          type: 'linear' as const,
          position: 'left' as const,
          min: yDomain.min,
          max: yDomain.max,
          title: { display: true, text: SERIES_CONFIG.generalCorrosionRate.label },
        },
        y1: {
          type: 'linear' as const,
          position: 'right' as const,
          min: y1Domain.min,
          max: y1Domain.max,
          title: { display: true, text: SERIES_CONFIG.maximumStingSpeed.label },
          grid: { drawOnChartArea: false },
        },
      },
    };
  });

  // ----------------------------- Grilla de variables restantes -----------------------------
  readonly miniCharts = computed<MiniChartCard[]>(() => {
    const records = this.windowRecords();
    const labels = this.windowLabels();

    return (Object.keys(MINI_SERIES_CONFIG) as MiniSeriesKey[]).map((key) => {
      const cfg = MINI_SERIES_CONFIG[key];
      const color = chartToken(cfg.color);
      const values = records.map((r) => r[key]);
      const hasAlert = values.some((v) => v != null && (v < cfg.limits.min || v > cfg.limits.max));

      return {
        key,
        label: cfg.label,
        hasAlert,
        data: {
          labels,
          datasets: [
            {
              label: cfg.label,
              borderColor: color,
              backgroundColor: color,
              borderWidth: 2,
              pointHoverRadius: 3,
              pointRadius: 1,
              tension: 0.3,
              spanGaps: true,
              data: values,
            },
          ],
        },
        options: this.buildMiniOptions(cfg.limits),
        plugins: [limitLinesPlugin],
      };
    });
  });

  private buildMiniOptions(limits: { min: number; max: number }): Record<string, unknown> {
    return {
      responsive: true,
      // Cromo -> Chart.defaults. Overrides: tooltip compacto (padding/fuentes) para las mini.
      plugins: {
        legend: { display: false },
        tooltip: {
          mode: 'index' as const,
          intersect: false,
          padding: 10,
          titleFont: { size: 12, weight: 'bold' },
          bodyFont: { size: 12 },
        },
        limitLines: limits,
      },
      scales: {
        x: { ticks: { maxRotation: 0, autoSkip: true, font: { size: 10 } } },
        y: { ticks: { font: { size: 10 } } },
      },
    };
  }

  // Arrow para poder pasarla como `[resetHook]` a `<app-chart-frame>` (la barra la ejecuta al "Restablecer").
  readonly resetMainView = (): void => {
    this.mainPageIndex.set(Math.max(0, this.mainPages().length - 1));
  };

  getSeriesConfig() {
    return SERIES_CONFIG;
  }

  getSeriesKeys(): SeriesKey[] {
    return Object.keys(SERIES_CONFIG) as SeriesKey[];
  }

  // Reciben string ISO del backend o timestamp (callbacks de ticks). El swap a
  // dateParts/isoToLocalTimestamp está pendiente de confirmar el formato de `date`.
  formatDate(d: string | number): string {
    const dt = new Date(d);
    const yy = String(dt.getFullYear()).slice(-2);
    return `${MESES[dt.getMonth()]} ${dt.getDate()} ${yy}`;
  }

  formatMonthYear(d: string | number): string {
    const dt = new Date(d);
    const yy = String(dt.getFullYear()).slice(-2);
    return `${MESES[dt.getMonth()]} ${yy}`;
  }
}
