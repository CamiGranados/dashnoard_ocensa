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

type SeriesKey = 'generalCorrosionRate' | 'maximumStingSpeed';

const SERIES_CONFIG: Record<SeriesKey, {
  label: string;
  axis: 'y' | 'y1';
  defaultType: 'line' | 'bar';
  color: string;
}> = {
  generalCorrosionRate: { label: 'Tasa de corrosión general', axis: 'y', defaultType: 'line', color: '#2f80d7' },
  maximumStingSpeed: { label: 'Velocidad máxima de picadura', axis: 'y1', defaultType: 'line', color: '#f3a12b' },
};

type MiniSeriesKey = 'temperatureC' | 'h2S' | 'ph' | 'conductivity' | 'alkalinity' | 'calcium';

// TODO(usuario): límites provisionales — reemplazar por los rangos reales del proceso cuando se definan.
const MINI_SERIES_CONFIG: Record<MiniSeriesKey, {
  label: string;
  color: string;
  limits: { min: number; max: number };
}> = {
  temperatureC: { label: 'Temperatura (°C)', color: '#2f80d7', limits: { min: 24, max: 32 } },
  h2S: { label: 'H2S', color: '#e8590c', limits: { min: 0, max: 5 } },
  ph: { label: 'pH', color: '#239a59', limits: { min: 0, max: 8.5 } },
  conductivity: { label: 'Conductividad', color: '#458ccc', limits: { min: 0, max: 3600 } },
  alkalinity: { label: 'Alcalinidad', color: '#f3a12b', limits: { min: 45, max: 1200 } },
  calcium: { label: 'Calcio', color: '#43474f', limits: { min: 0, max: 700 } },
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

const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

@Component({
  selector: 'app-physicochemistry',
  imports: [CommonModule, FormsModule, TableModule, ChartModule, SliderModule, SelectButtonModule],
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

  // ----------------------------- Gráfica: tasa de corrosión / velocidad de picadura -----------------------------
  Math = Math;
  windowSize = 60;
  visibleRange = signal<[number, number]>([0, 0]);
  sliderPosition = signal(0);

  chartTypeOptions = [
    { label: 'Barras', value: 'bar' },
    { label: 'Línea', value: 'line' },
  ];

  seriesTypes = signal<Record<SeriesKey, 'line' | 'bar'>>(
    (Object.keys(SERIES_CONFIG) as SeriesKey[]).reduce((acc, key) => {
      acc[key] = SERIES_CONFIG[key].defaultType;
      return acc;
    }, {} as Record<SeriesKey, 'line' | 'bar'>),
  );

  visibleSeries = signal<Record<SeriesKey, boolean>>(
    (Object.keys(SERIES_CONFIG) as SeriesKey[]).reduce((acc, key) => {
      acc[key] = true;
      return acc;
    }, {} as Record<SeriesKey, boolean>),
  );

  constructor() {
    // al llegar datos nuevos (cambio de filtros), reencuadra ambas ventanas visibles (gráfica
    // principal y grilla de variables restantes) en los últimos puntos
    effect(() => {
      const total = this.sortedRecords().length;
      if (total === 0) {
        this.visibleRange.set([0, 0]);
        this.sliderPosition.set(0);
        this.mainPageIndex.set(0);
        return;
      }

      const startIdx = Math.max(0, total - this.windowSize);
      this.sliderPosition.set(startIdx);
      this.visibleRange.set([startIdx, total - 1]);

      this.mainPageIndex.set(Math.max(0, this.mainPages().length - 1));
    });
  }

  // Ventana visible de la grilla de variables restantes (la gráfica principal ya no se recorta).
  readonly windowRecords = computed(() => {
    const records = this.sortedRecords();
    const [start, end] = this.visibleRange();
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
    const pageSizeYears = maxYear - minYear + 1 <= 1 ? 1 : 4;

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
        .map((r) => r.generalCorrosionRate)
        .filter((v): v is number => v != null),
    ),
  );

  private readonly mainY1Domain = computed(() =>
    Physicochemistry.domainOf(
      this.sortedRecords()
        .map((r) => r.maximumStingSpeed)
        .filter((v): v is number => v != null),
    ),
  );

  readonly chartData = computed(() => {
    const records = this.sortedRecords();
    const visible = this.visibleSeries();
    const types = this.seriesTypes();

    if (!records.length) return { datasets: [] };

    const datasets = (Object.keys(SERIES_CONFIG) as SeriesKey[])
      .filter((key) => visible[key])
      .map((key) => {
        const cfg = SERIES_CONFIG[key];
        const currentType = types[key];
        const isBar = currentType === 'bar';

        return {
          type: currentType,
          label: cfg.label,
          yAxisID: cfg.axis,
          borderColor: cfg.color,
          backgroundColor: cfg.color,
          order: isBar ? 999 : 0,
          borderWidth: isBar ? 0 : 2,
          barThickness: isBar ? 8 : undefined,
          pointHoverRadius: isBar ? undefined : 3,
          pointRadius: isBar ? undefined : 1,
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
      maintainAspectRatio: false,
      animation: false as const,
      plugins: {
        legend: { position: 'top' as const },
        tooltip: {
          mode: 'index' as const,
          intersect: false,
          backgroundColor: '#1f3a52',
          padding: 12,
          titleColor: '#ffffff',
          bodyColor: '#ffffff',
          borderColor: '#2a4f6b',
          borderWidth: 1,
          cornerRadius: 6,
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
          grid: { color: '#eef2f7' },
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
              borderColor: cfg.color,
              backgroundColor: cfg.color,
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
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          mode: 'index' as const,
          intersect: false,
          backgroundColor: '#1f3a52',
          padding: 10,
          titleColor: '#ffffff',
          bodyColor: '#ffffff',
          borderColor: '#2a4f6b',
          borderWidth: 1,
          cornerRadius: 6,
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

  toggleSeriesType(key: SeriesKey, newType: 'line' | 'bar'): void {
    this.seriesTypes.set({ ...this.seriesTypes(), [key]: newType });
  }

  toggleSeriesVisibility(key: SeriesKey): void {
    const current = this.visibleSeries();
    this.visibleSeries.set({ ...current, [key]: !current[key] });
  }

  onSliderChange(newPosition: number): void {
    const end = Math.min(newPosition + this.windowSize, this.sortedRecords().length - 1);
    this.visibleRange.set([newPosition, end]);
  }

  resetZoom(): void {
    const total = this.sortedRecords().length;
    const startIdx = Math.max(0, total - this.windowSize);
    this.sliderPosition.set(startIdx);
    this.visibleRange.set([startIdx, Math.max(0, total - 1)]);
  }

  resetMainView(): void {
    this.mainPageIndex.set(Math.max(0, this.mainPages().length - 1));
  }

  getSeriesConfig() {
    return SERIES_CONFIG;
  }

  getSeriesKeys(): SeriesKey[] {
    return Object.keys(SERIES_CONFIG) as SeriesKey[];
  }

  formatDate(d: string | number): string {
    const dt = new Date(d);
    const yy = String(dt.getFullYear()).slice(-2);
    return `${MESES_CORTOS[dt.getMonth()]} ${dt.getDate()} ${yy}`;
  }

  formatMonthYear(d: string | number): string {
    const dt = new Date(d);
    const yy = String(dt.getFullYear()).slice(-2);
    return `${MESES_CORTOS[dt.getMonth()]} ${yy}`;
  }
}
