import { Component,computed, effect, inject, signal} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChartModule } from 'primeng/chart';
import { SliderModule } from 'primeng/slider';
import { SelectButtonModule } from 'primeng/selectbutton';
import { finalize } from 'rxjs';
import { FiltersService } from '../../../../core/services/filters.service';
import { FiltersStateService } from '../../../../core/services/filters-state.service';
import { Spinner } from '../../../../core/shared/components/spinner/spinner';

export interface Measurement {
  variable: string;
  numericValue: number;
  date: string;
}

const SERIES_CONFIG: Record<string, {
  label: string;
  axis: 'y' | 'y1';
  defaultType: 'line' | 'bar';
  color: string;
  border: string;
  dashed?: boolean;
}> = {
  'FWV reportada':        { label: 'FWV Reportada',     axis: 'y',  defaultType: 'line', color: '#2f80d7', border:'#2f80d7', dashed: false },
  'FWV estimada':         { label: 'FWV Estimada',      axis: 'y',  defaultType: 'line', color: '#4da7e9', border:'#4da7e9', dashed: true },  // ← punteada
  'FWV calculada':        { label: 'FWV Calculada',      axis: 'y',  defaultType: 'line', color: '#22ba76', border:'#22ba76', dashed: false },
  'FWV incrementada':     { label: 'FWV Incrementada', axis: 'y', defaultType: 'line',  color: '#f3a12b', border:'#f3a12b', dashed: false },
  'gsv(bls)':             { label: 'GSV',  axis: 'y1', defaultType: 'bar',  color: '#d8dbde', border:'#d8dbde', dashed: false },
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

  measurements = signal<Measurement[]>([]);
  visibleRange = signal<[number, number]>([0, 0]);
  noData = signal(false);
  loadingMeasurements = signal(false);
  windowSize = 60;
  sliderPosition = signal(0);
  Math = Math;

  allDates = computed(() =>
    [...new Set(this.measurements().map(m => m.date))].sort()
  );
  chartTypeOptions = [
    { label: 'Barras', value: 'bar' },
    { label: 'Línea', value: 'line' }
  ];
  // Control de visualización por serie (line/bar)
  seriesTypes = signal<Record<string, 'line' | 'bar'>>(
    Object.entries(SERIES_CONFIG).reduce((acc, [key, cfg]) => {
      acc[key] = cfg.defaultType;
      return acc;
    }, {} as Record<string, 'line' | 'bar'>)
  );

  // Control de visibilidad de cada serie
  visibleSeries = signal<Record<string, boolean>>(
    Object.keys(SERIES_CONFIG).reduce((acc, key) => {
      acc[key] = true;
      return acc;
    }, {} as Record<string, boolean>)
  );


  constructor() {
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
              this.visibleRange.set([0, 0]);
              return;
            }
            this.noData.set(false);
            this.measurements.set(data);
            const total = new Set(data.map(m => m.date)).size;

            const startIdx = Math.max(0, total - this.windowSize);
            this.visibleRange.set([startIdx, Math.max(0, total - 1)]);
            this.sliderPosition.set(startIdx);
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
    const visible = this.visibleSeries();
    const types = this.seriesTypes();

    if (!dates.length) return { labels: [], datasets: [] };

    const datasets = Object.entries(SERIES_CONFIG)
      .filter(([key]) => visible[key])
      .map(([variable, cfg]) => {
        const currentType = types[variable];
        const isBar = currentType === 'bar';

        return {
          type: currentType,
          label: cfg.label,
          yAxisID: cfg.axis,
          borderColor: cfg.border,
          borderDash: cfg.dashed && currentType === 'line' ? [5, 5] : [],
          backgroundColor: cfg.color,
          order: isBar ? 999 : 0,
          borderRadius: isBar ? 0 : undefined,
          borderSkipped: isBar ? false : undefined,
          borderWidth: isBar ? 0 : 2.3,
          pointHoverRadius: isBar ? undefined : 3,
          pointRadius: isBar ? undefined : 1,
          tension: 0.3,
          spanGaps: true,
          data: dates.map(d => {
            const punto = data.find(m => m.variable === variable && m.date === d);
            return punto ? punto.numericValue : null;
          }),
        };
      });

    return { labels: dates.map(d => this.formatDate(d)), datasets };
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
    const [start, end] = this.visibleRange();
    const yDomain = this.yDomain();
    const y1Domain = this.y1Domain();

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
            title: (context: any) => {
              // El eje X colapsa la fecha a "Mes Año", así que varias visitas del mismo mes
              // salen con el mismo texto. En el tooltip mostramos la fecha completa con día
              // para poder cruzarla contra la base de datos.
              const iso = this.allDates()[context[0]?.dataIndex ?? 0];
              return iso ? this.formatDateLong(iso) : context[0].label;
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
          grid: { color: '#eef2f7' },
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

  toggleSeriesType(variable: string, newType: 'line' | 'bar'): void {
    const current = this.seriesTypes();
    this.seriesTypes.set({ ...current, [variable]: newType });
  }

  toggleSeriesVisibility(variable: string): void {
    const current = this.visibleSeries();
    this.visibleSeries.set({ ...current, [variable]: !current[variable] });
  }


  // --- HELPERS ---
  private static readonly MESES =
    ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

  // Extrae [año, mes(1-12), día] de una fecha ISO ('2025-08-05' o '2025-08-05T00:00:00')
  // leyendo el string directamente: new Date('2025-08-05') se interpreta como UTC y en
  // Colombia (UTC-5) devolvería el día anterior con getDate().
  private dateParts(d: string): [number, number, number] {
    const parts = (d ?? '').slice(0, 10).split('-').map(Number);
    if (parts.length === 3 && parts.every(Number.isFinite)) {
      return [parts[0], parts[1], parts[2]];
    }
    const dt = new Date(d);
    return [dt.getFullYear(), dt.getMonth() + 1, dt.getDate()];
  }

  formatDate(d: string): string {
    const [y, m] = this.dateParts(d);
    return `${Corrosion.MESES[m - 1]} ${y}`;
  }

  // Fecha completa con día, para el tooltip.
  formatDateLong(d: string): string {
    const [y, m, day] = this.dateParts(d);
    return `${day} ${Corrosion.MESES[m - 1]} ${y}`;
  }

  onSliderChange(newPosition: number): void {
    const end = Math.min(newPosition + this.windowSize, this.allDates().length - 1);
    this.visibleRange.set([newPosition, end]);
  }

  resetZoom(): void {
    const total = this.allDates().length;
    const windowSize = 60;
    const startIdx = Math.max(0, total - windowSize);
    this.sliderPosition.set(startIdx);
    this.visibleRange.set([startIdx, Math.max(0, total - 1)]);
  }

  getSeriesConfig() {
    return SERIES_CONFIG;
  }

  getSeriesKeys() {
    return Object.keys(SERIES_CONFIG);
  }
}
