import { Component,computed, effect, inject, signal} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChartModule } from 'primeng/chart';
import { SliderModule } from 'primeng/slider';
import { FiltersService } from '../../../../core/services/filters.service';
import { FiltersStateService } from '../../../../core/services/filters-state.service';

export interface Measurement {
  variable: string;
  numericValue: number;
  date: string;
}
// const SERIES_CONFIG: Record<string, { label: string; axis: 'y' | 'y1'; type: 'line' | 'bar'; color: string, border:string }> = {
//   'FWV reportada':        { label: 'Agua reportada',     axis: 'y',  type: 'line', color: '#f8f8f8', border:'#2f80d7' },
//   'FWV estimada':         { label: 'Agua estimada',      axis: 'y',  type: 'line', color: '#ffffff', border:'#4da7e9' },
//   'FWV calculada':        { label: 'Agua ajustada',      axis: 'y',  type: 'line', color: '#fdfdfd', border:'#22ba76' },
//   'FWV incrementada':     { label: 'Agua incrementada', axis: 'y1', type: 'bar',  color: '#fdfdfd', border:'#f3a12b'},
//   'gsv(bls)':             { label: 'GSV',  axis: 'y1', type: 'bar',  color: '#fdfdfd', border:'#d8dbde' },
// };

const SERIES_CONFIG: Record<string, {
  label: string;
  axis: 'y' | 'y1';
  defaultType: 'line' | 'bar';
  color: string;
  border: string;
  dashed?: boolean;
}> = {
  'FWV reportada':        { label: 'Agua reportada',     axis: 'y',  defaultType: 'line', color: '#f8f8f8', border:'#2f80d7', dashed: false },
  'FWV estimada':         { label: 'Agua estimada',      axis: 'y',  defaultType: 'line', color: '#ffffff', border:'#4da7e9', dashed: true },  // ← punteada
  'FWV calculada':        { label: 'Agua ajustada',      axis: 'y',  defaultType: 'line', color: '#fdfdfd', border:'#22ba76', dashed: false },
  'FWV incrementada':     { label: 'Agua incrementada', axis: 'y1', defaultType: 'bar',  color: '#fdfdfd', border:'#f3a12b', dashed: false },
  'gsv(bls)':             { label: 'GSV',  axis: 'y1', defaultType: 'bar',  color: '#fdfdfd', border:'#d8dbde', dashed: false },
};

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

@Component({
  selector: 'app-corrosion',
  imports: [ChartModule, SliderModule, FormsModule],
  templateUrl: './corrosion.html',
  styleUrl: './corrosion.css',
})

export class Corrosion {
  private filtersState = inject(FiltersStateService);
  private dataService = inject(FiltersService);

  measurements = signal<Measurement[]>([]);
  visibleRange = signal<[number, number]>([0, 0]);
  noData = signal(false);

  allDates = computed(() =>
    [...new Set(this.measurements().map(m => m.date))].sort()
  );

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
    // se re-ejecuta automáticamente cuando cambian los filtros
    effect(() => {
      const f = this.filtersState.filters();

      // no dispares si aún no hay tanque/año
      if (!f.tanque || !f.years) return;

      this.dataService.getMeasurements(f.tanque, f.years, f.months).subscribe({
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
          this.visibleRange.set([0, Math.max(0, total - 1)]);
        },
        error: (err) => console.error('Error mediciones', err),
      });
    });
  }


  chartData = computed(() => {
    const data = this.measurements();
    const dates = this.allDates();
    const visible = this.visibleSeries();  // ← Usar visibilidad
    const types = this.seriesTypes();      // ← Usar tipos dinámicos

    if (!dates.length) return { labels: [], datasets: [] };

    const [start, end] = this.visibleRange();
    const visibles = dates.slice(start, end + 1);

    const datasets = Object.entries(SERIES_CONFIG)
      .filter(([key]) => visible[key])  // ← Filtrar por visibilidad
      .map(([variable, cfg]) => {
        const currentType = types[variable];  // ← Obtener tipo actual

        return {
          type: currentType,
          label: cfg.label,
          yAxisID: cfg.axis,
          borderColor: cfg.border,
          borderDash: cfg.dashed && currentType === 'line' ? [5, 5] : [],  // ← Línea punteada
          backgroundColor: currentType === 'bar' ? hexToRgba(cfg.color, 0.30) : cfg.color,
          borderRadius: currentType === 'bar' ? 6 : undefined,
          borderSkipped: currentType === 'bar' ? false : undefined,
          borderWidth: currentType === 'bar' ? 2 : 2,
          pointHoverRadius: currentType === 'bar' ? undefined : 7,
          pointRadius: currentType === 'bar' ? undefined : 4,
          tension: 0.3,
          spanGaps: true,
          data: visibles.map(d => {
            const punto = data.find(m => m.variable === variable && m.date === d);
            return punto ? punto.numericValue : null;
          }),
        };
      });

    return { labels: visibles.map(d => this.formatDate(d)), datasets };
  });

  // ----------------------------- Graph --------------------
  chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'top' as const } },
    scales: {
      y:  { type: 'linear', position: 'left',  title: { display: true, text: 'BBL' } },
      y1: { type: 'linear', position: 'right', title: { display: true, text: 'GAL' },
            grid: { drawOnChartArea: false } },
    },
  };

  toggleSeriesType(variable: string, newType: 'line' | 'bar'): void {
    const current = this.seriesTypes();
    this.seriesTypes.set({ ...current, [variable]: newType });
  }

  toggleSeriesVisibility(variable: string): void {
    const current = this.visibleSeries();
    this.visibleSeries.set({ ...current, [variable]: !current[variable] });
  }


  // --- HELPERS ---
  formatDate(d: string): string {
    const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    const dt = new Date(d);
    return `${dt.getDate()} ${meses[dt.getMonth()]}`;
  }

  resetZoom(): void {
    const total = this.allDates().length;
    this.visibleRange.set([0, Math.max(0, total - 1)]);
  }

  getSeriesConfig() {
    return SERIES_CONFIG;
  }

  getSeriesKeys() {
    return Object.keys(SERIES_CONFIG);
  }
}
