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
const SERIES_CONFIG: Record<string, { label: string; axis: 'y' | 'y1'; type: 'line' | 'bar'; color: string }> = {
  'FWV reportada':        { label: 'Agua reportada',     axis: 'y',  type: 'line', color: '#3b82f6' },
  'FWV estimada':         { label: 'Agua estimada',      axis: 'y',  type: 'line', color: '#22c55e' },
  'FWV calculada':        { label: 'Agua ajustada',      axis: 'y',  type: 'line', color: '#8b5cf6' },
  'Dosis programada':     { label: 'Biocida Programado', axis: 'y1', type: 'bar',  color: '#fcd34d' },
  'Dosis real inyectada': { label: 'Biocida Inyectado',  axis: 'y1', type: 'bar',  color: '#f59e0b' },
};
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

  allDates = computed(() =>
    [...new Set(this.measurements().map(m => m.date))].sort()
  );

  constructor() {
    // se re-ejecuta automáticamente cuando cambian los filtros
    effect(() => {
      const f = this.filtersState.filters();

      // no dispares si aún no hay tanque/año
      if (!f.tanque || !f.year) return;

      this.dataService.getMeasurements(f.tanque, f.year, f.months).subscribe({
        next: (data) => {
          this.measurements.set(data);
          // al llegar datos nuevos, la ventana del slider abarca todo
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
    if (!dates.length) return { labels: [], datasets: [] };

    const [start, end] = this.visibleRange();
    const visibles = dates.slice(start, end + 1);

    const datasets = Object.entries(SERIES_CONFIG).map(([variable, cfg]) => ({
      type: cfg.type,
      label: cfg.label,
      yAxisID: cfg.axis,
      borderColor: cfg.color,
      backgroundColor: cfg.color,
      tension: 0.3,
      spanGaps: true,
      data: visibles.map(d => {
        const punto = data.find(m => m.variable === variable && m.date === d);
        return punto ? punto.numericValue : null;
      }),
    }));

    return { labels: visibles.map(d => this.formatDate(d)), datasets };
  });

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
}
