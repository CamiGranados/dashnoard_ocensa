import { Component,computed, effect, inject, signal} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChartModule } from 'primeng/chart';
import { SliderModule } from 'primeng/slider';
import { SelectButtonModule } from 'primeng/selectbutton';
import { FiltersService } from '../../../../core/services/filters.service';
import { FiltersStateService } from '../../../../core/services/filters-state.service';

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
  imports: [ChartModule, SliderModule, FormsModule, SelectButtonModule],
  templateUrl: './corrosion.html',
  styleUrl: './corrosion.css',
})

export class Corrosion {
  private filtersState = inject(FiltersStateService);
  private dataService = inject(FiltersService);

  measurements = signal<Measurement[]>([]);
  visibleRange = signal<[number, number]>([0, 0]);
  noData = signal(false);
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
    // se re-ejecuta automáticamente cuando cambian los filtros
    effect(() => {
      const f = this.filtersState.filters();
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

          const startIdx = Math.max(0, total - this.windowSize);
          this.visibleRange.set([startIdx, Math.max(0, total - 1)]);
          this.sliderPosition.set(startIdx);
        },
        error: (err) => console.error('Error mediciones', err),
      });
    });
  }


  chartData = computed(() => {
    const data = this.measurements();
    const dates = this.allDates();
    const visible = this.visibleSeries();
    const types = this.seriesTypes();

    if (!dates.length) return { labels: [], datasets: [] };

    const [start, end] = this.visibleRange();
    const visibles = dates.slice(start, end + 1);

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
          borderWidth: isBar ? 0 : 2,
          pointHoverRadius: isBar ? undefined : 3,
          pointRadius: isBar ? undefined : 1,
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
            return context[0].label;
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
      y:  { type: 'linear', position: 'left',  title: { display: true, text: 'Agua (BBL)' } },
      y1: { type: 'linear', position: 'right', title: { display: true, text: 'GSV (BBL)' },
            grid: { drawOnChartArea: false } },
    },
    bar: {
      barPercentage: 0.5,
      categoryPercentage: 0.8,
    }
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
    return `${meses[dt.getMonth()]} ${dt.getFullYear()}`;
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
