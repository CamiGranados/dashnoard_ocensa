import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChartModule } from 'primeng/chart';
import { SliderModule } from 'primeng/slider';
import { SelectButtonModule } from 'primeng/selectbutton';
import { finalize } from 'rxjs';
import { FiltersService } from '../../../../core/services/filters.service';
import { FiltersStateService } from '../../../../core/services/filters-state.service';
import { Spinner } from '../../../../shared/components/spinner/spinner';
import { formatFullDate, formatMonthYear } from '../../../../shared/charts/chart-dates';
import { chartToken, FWV_TOKEN } from '../../../../shared/charts/chart-tokens';
import { applyChartDefaults } from '../../../../shared/charts/chart-defaults';
import { createWindowState } from '../../../../shared/charts/window-state';
import { createSeriesToggles, CHART_TYPE_OPTIONS } from '../../../../shared/charts/series-toggles';
import { lineOrBarDataset } from '../../../../shared/charts/chart-datasets';

export interface Measurement {
  variable: string;
  numericValue: number;
  date: string;
}

// `color` / `border` guardan el NOMBRE del token (chart-tokens.css); se resuelven
// con chartToken() al armar los datasets y en el swatch de la leyenda.
const SERIES_CONFIG: Record<string, {
  label: string;
  axis: 'y' | 'y1';
  defaultType: 'line' | 'bar';
  color: string;
  border: string;
  dashed?: boolean;
}> = {
  'FWV reportada':    { label: 'FWV Reportada',    axis: 'y',  defaultType: 'line', color: FWV_TOKEN.reportada,    border: FWV_TOKEN.reportada,    dashed: false },
  'FWV estimada':     { label: 'FWV Estimada',     axis: 'y',  defaultType: 'line', color: FWV_TOKEN.estimada,     border: FWV_TOKEN.estimada,     dashed: true },  // ← punteada
  'FWV calculada':    { label: 'FWV Calculada',    axis: 'y',  defaultType: 'line', color: FWV_TOKEN.calculada,    border: FWV_TOKEN.calculada,    dashed: false },
  'FWV incrementada': { label: 'FWV Incrementada', axis: 'y',  defaultType: 'line', color: FWV_TOKEN.incrementada, border: FWV_TOKEN.incrementada, dashed: false },
  'gsv(bls)':         { label: 'GSV',              axis: 'y1', defaultType: 'bar',  color: '--chart-gsv-fill',     border: '--chart-gsv',         dashed: false },
};


@Component({
  selector: 'app-corrosion',
  imports: [ChartModule, SliderModule, FormsModule, SelectButtonModule, Spinner],
  templateUrl: './corrosion.html',
  styleUrl: './corrosion.css',
})

export class Corrosion {
  private filtersState = inject(FiltersStateService);
  private dataService = inject(FiltersService);

  // Resuelve tokens de color en el template (swatch de la leyenda de series).
  protected readonly chartToken = chartToken;

  measurements = signal<Measurement[]>([]);
  noData = signal(false);
  loadingMeasurements = signal(false);
  Math = Math;

  allDates = computed(() =>
    [...new Set(this.measurements().map(m => m.date))].sort()
  );

  private readonly total = computed(() => this.allDates().length);

  // Ventana visible (scroll horizontal) y toggles de serie: estado compartido en shared/charts.
  protected readonly window = createWindowState(this.total);
  protected readonly toggles = createSeriesToggles<string>(
    Object.fromEntries(
      Object.entries(SERIES_CONFIG).map(([key, cfg]) => [key, cfg.defaultType]),
    ) as Record<string, 'line' | 'bar'>,
  );
  protected readonly chartTypeOptions = CHART_TYPE_OPTIONS;

  constructor() {
    applyChartDefaults();

    // se re-ejecuta automáticamente cada vez que cambian los filtros (tanque, años, meses)
    effect((onCleanup) => {
      const f = this.filtersState.filters();
      if (!f.tank || !f.years) return;

      this.loadingMeasurements.set(true);

      const subscription = this.dataService.getMeasurements(f.tank, f.years, f.months)
        .pipe(finalize(() => this.loadingMeasurements.set(false)))
        .subscribe({
          next: (data) => {
            if (!data || data.length === 0) {
              this.noData.set(true);
              this.measurements.set([]);
              return;
            }
            this.noData.set(false);
            // `window` reencuadra solo al cambiar `total` (effect en createWindowState).
            this.measurements.set(data);
          },
          error: (err) => console.error('Error mediciones', err),
        });

      // si los filtros vuelven a cambiar antes de que responda, se cancela la petición anterior
      onCleanup(() => subscription.unsubscribe());
    });
  }


  // La gráfica recibe SIEMPRE todo el histórico con todas las etiquetas. El slider de "Ventana
  // visible" solo desplaza el rango de índices dibujado (scales.x.min/max), así el canvas, los
  // ejes Y y la leyenda nunca se mueven ni se reescalan: solo se desplaza el contenido, como un
  // scroll horizontal. Mismo criterio que la gráfica principal de `physicochemistry`.
  chartData = computed(() => {
    const data = this.measurements();
    const dates = this.allDates();
    const visible = this.toggles.visible();
    const types = this.toggles.types();

    if (!dates.length) return { labels: [], datasets: [] };

    const datasets = Object.entries(SERIES_CONFIG)
      .filter(([key]) => visible[key])
      .map(([variable, cfg]) => {
        const currentType = types[variable];
        return lineOrBarDataset({
          label: cfg.label,
          type: currentType,
          stroke: chartToken(cfg.border),
          fill: chartToken(cfg.color),
          yAxisID: cfg.axis,
          dashed: cfg.dashed,
          order: currentType === 'bar' ? 999 : 0,
          data: dates.map(d => {
            const punto = data.find(m => m.variable === variable && m.date === d);
            return punto ? punto.numericValue : null;
          }),
        });
      });

    return { labels: dates.map(d => this.formatMonthYear(d)), datasets };
  });

  // "Colchón" permitido más allá del rango central p10–p90 antes de considerar un valor outlier
  // y no dejar que estire el eje. 2 = el eje puede llegar hasta 2·(p90−p10) por encima de p90
  // (o por debajo de p10); un valor más extremo que eso (p. ej. un GSV 10x lo normal) se recorta.
  // Subirlo = recorta solo lo MUY atípico (eje más alto); bajarlo = eje más ajustado.
  private static readonly AXIS_FENCE = 2;

  private static percentile(sorted: number[], p: number): number {
    if (!sorted.length) return 0;
    const idx = (sorted.length - 1) * p;
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
  }

  // "Nice step": 1 / 2 / 2.5 / 5 · 10ⁿ, como el que usa Chart.js para sus ticks por defecto.
  private static niceStep(raw: number): number {
    const mag = Math.pow(10, Math.floor(Math.log10(Math.abs(raw) || 1)));
    const norm = Math.abs(raw) / mag;
    const nice = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10;
    return nice * mag;
  }

  // Dominio FIJO del eje: acota el rango con un cerco alrededor de p10–p90 (así un outlier
  // extremo no lo estira), incluye el 0 y redondea a topes "redondos". Se calcula una sola vez
  // sobre TODO el histórico, así el eje no se reescala al desplazar la ventana visible.
  private static domainOf(values: number[]): { min: number; max: number } {
    const sorted = values
      .filter((v): v is number => v != null && Number.isFinite(v))
      .sort((a, b) => a - b);
    if (!sorted.length) return { min: 0, max: 1 };

    const p10 = Corrosion.percentile(sorted, 0.1);
    const p90 = Corrosion.percentile(sorted, 0.9);
    const spread = p90 - p10 || Math.abs(p90) || 1;

    const lo = Math.max(sorted[0], p10 - Corrosion.AXIS_FENCE * spread);
    const hi = Math.min(sorted[sorted.length - 1], p90 + Corrosion.AXIS_FENCE * spread);

    const min = Math.min(0, lo);
    const max = Math.max(0, hi);
    if (min === max) return { min: min - 1, max: max + 1 };

    const step = Corrosion.niceStep((max - min) / 5);
    return {
      min: Math.floor(min / step) * step,
      max: Math.ceil(max / step) * step,
    };
  }

  // Dominio fijo por eje, calculado una sola vez sobre TODO el histórico: así el eje Y no se
  // reescala (ni "salta") al desplazar la ventana visible.
  private valuesForAxis(axis: 'y' | 'y1'): number[] {
    const keys = new Set(
      Object.entries(SERIES_CONFIG)
        .filter(([, cfg]) => cfg.axis === axis)
        .map(([key]) => key),
    );
    return this.measurements()
      .filter(m => keys.has(m.variable))
      .map(m => m.numericValue)
      .filter((v): v is number => v != null);
  }

  private readonly yDomain = computed(() => Corrosion.domainOf(this.valuesForAxis('y')));
  private readonly y1Domain = computed(() => Corrosion.domainOf(this.valuesForAxis('y1')));

  // ----------------------------- Graph --------------------
  chartOptions = computed(() => {
    const [start, end] = this.window.range();
    const yDomain = this.yDomain();
    const y1Domain = this.y1Domain();

    return {
      responsive: true,
      // Cromo (tooltip color, grid, ejes, maintainAspectRatio) -> Chart.defaults (chart-defaults.ts).
      animation: false as const,
      plugins: {
        legend: { position: 'top' as const },
        tooltip: {
          mode: 'index' as const,
          intersect: false,
          titleFont: { size: 14, weight: 'bold' },
          bodyFont: { size: 13 },
          displayColors: true,
          callbacks: {
            title: (context: any) => {
              // El eje X colapsa la fecha a "Mes Año", así que varias visitas del mismo mes
              // salen con el mismo texto. En el tooltip mostramos la fecha completa con día
              // para poder cruzarla contra la base de datos.
              const iso = this.allDates()[context[0]?.dataIndex ?? 0];
              return iso ? formatFullDate(iso) : context[0].label;
            },
            label: (context: any) => {
              const label = context.dataset.label || '';
              const value = context.parsed.y?.toLocaleString() || context.parsed;
              return `${label}  ${value}`;
            }
          }
        }
      },
      scales: {
        x: {
          type: 'category' as const,
          min: start,
          max: end,
          ticks: { maxRotation: 0, autoSkip: true },
        },
        y:  { type: 'linear', position: 'left',  min: yDomain.min, max: yDomain.max,
              title: { display: true, text: 'Agua (BBL)' } },
        y1: { type: 'linear', position: 'right', min: y1Domain.min, max: y1Domain.max,
              title: { display: true, text: 'GSV (BBL)' },
              grid: { drawOnChartArea: false } },
      },
      bar: {
        barPercentage: 0.5,
        categoryPercentage: 0.8,
      }
    };
  });

  // --- HELPERS ---
  // Formateo de fechas centralizado en shared/charts/chart-dates: dateParts hace
  // slice del string ISO para no perder el día por el desfase UTC en Colombia.
  protected readonly formatMonthYear = formatMonthYear;

  getSeriesConfig() {
    return SERIES_CONFIG;
  }

  getSeriesKeys() {
    return Object.keys(SERIES_CONFIG);
  }
}
