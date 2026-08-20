import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ChartModule } from 'primeng/chart';
import { MicrobiologyService } from '../../../../core/services/microbiology.service';
import { buildTimelinePoints, toLog10 } from './microbiology-timeline.transform';
import type { SamplingCategory, TimelinePoint } from './microbiology-timeline.transform';

type ScatterKey = 'bsrPlanct' | 'bpaPlanct' | 'bhtPlanct' | 'bAntPlanct';

interface ScatterSeriesConfig {
  label: string;
  color: string;
  pointStyle: string;
}

// Mismos colores que ya usa thps-tolerance para bsr/bpa/bht/bant, para que la lectura sea
// consistente entre tabs aunque esta gráfica no importe ese archivo.
const SCATTER_SERIES: Record<ScatterKey, ScatterSeriesConfig> = {
  bsrPlanct: { label: 'BSR planctónica', color: '#1c4463', pointStyle: 'circle' },
  bpaPlanct: { label: 'BPA planctónica', color: '#e8590c', pointStyle: 'triangle' },
  bhtPlanct: { label: 'BHT planctónica', color: '#239a59', pointStyle: 'rect' },
  bAntPlanct: { label: 'BAnT planctónica', color: '#43474f', pointStyle: 'rectRot' },
};

const CATEGORY_COLORS: Record<SamplingCategory, string> = {
  Prebache: '#e8590c',
  Postbache: '#239a59',
};

const CATEGORY_LEGEND_ORDER: SamplingCategory[] = ['Prebache', 'Postbache'];

const REFERENCE_LINE_COLOR = '#c94a08'; // mismo tono "alerta" que usa thps-tolerance en sus tarjetas danger
const THPS_LINE_COLOR = '#2f80d7';

const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

@Component({
  selector: 'app-microbiology',
  imports: [CommonModule, TableModule, ChartModule],
  templateUrl: './microbiology.html',
  styleUrl: './microbiology.css',
})
export class Microbiology {
  private readonly microbiologyService = inject(MicrobiologyService);

  readonly review = this.microbiologyService.review;

  readonly records = computed(() => this.review.value()?.data ?? []);
  readonly totalRecords = computed(() => this.records().length);

  // ------------------------- Gráfica de serie temporal -------------------------
  readonly timelinePoints = computed<TimelinePoint[]>(() => buildTimelinePoints(this.records()));

  readonly chartData = computed(() => {
    const pts = this.timelinePoints();
    if (!pts.length) return { datasets: [] };

    const yMax = this.primaryYMax(pts);

    const categoryBars = {
      type: 'bar',
      label: 'Etapa de bacheo',
      yAxisID: 'y',
      data: pts.map((p) => ({ x: p.timestamp, y: yMax, category: p.category })),
      backgroundColor: pts.map((p) => hexToRgba(CATEGORY_COLORS[p.category], 0.25)),
      barThickness: 16,
      borderWidth: 0,
      order: 999,
    };

    // Datasets "fantasma" (sin data) solo para que la leyenda tenga una entrada por
    // categoría con su color sólido; la barra real de arriba comparte color pero en baja
    // opacidad y no puede representarse como una sola entrada de leyenda por sí misma.
    const categoryLegend = CATEGORY_LEGEND_ORDER.map((category) => ({
      type: 'bar' as const,
      label: category,
      data: [] as unknown[],
      backgroundColor: CATEGORY_COLORS[category],
      order: 999,
    }));

    const referenceLine = {
      type: 'line',
      label: 'Límite 20%',
      yAxisID: 'y',
      data: pts.map((p) => ({ x: p.timestamp, y: 20 })),
      borderColor: REFERENCE_LINE_COLOR,
      backgroundColor: REFERENCE_LINE_COLOR,
      borderDash: [6, 4],
      borderWidth: 2,
      pointRadius: 0,
      pointHoverRadius: 0,
      tension: 0,
      order: 0,
    };

    const thpsLine = {
      type: 'line',
      label: 'THPS %',
      yAxisID: 'y',
      data: pts.map((p) => ({ x: p.timestamp, y: p.thpsPercent, category: p.category })),
      borderColor: THPS_LINE_COLOR,
      backgroundColor: THPS_LINE_COLOR,
      borderWidth: 2,
      pointRadius: 3,
      pointHoverRadius: 5,
      tension: 0.3,
      spanGaps: true,
      order: 0,
    };

    const scatterDatasets = (Object.keys(SCATTER_SERIES) as ScatterKey[]).map((key) => {
      const cfg = SCATTER_SERIES[key];
      const data = pts
        .filter((p) => p[key] != null)
        .map((p) => ({ x: p.timestamp, y: toLog10(p[key]), raw: p[key] }));

      return {
        type: 'scatter',
        label: cfg.label,
        yAxisID: 'y1',
        data,
        showLine: false,
        pointStyle: cfg.pointStyle,
        pointRadius: 4,
        pointHoverRadius: 6,
        borderColor: cfg.color,
        backgroundColor: cfg.color,
        order: 0,
      };
    });

    return {
      datasets: [categoryBars, ...categoryLegend, referenceLine, thpsLine, ...scatterDatasets],
    };
  });

  readonly chartOptions = computed(() => {
    const pts = this.timelinePoints();
    const timestamps = pts.map((p) => p.timestamp);
    const xMin = timestamps.length ? Math.min(...timestamps) : 0;
    const xMax = timestamps.length ? Math.max(...timestamps) : 0;
    const yMax = this.primaryYMax(pts);

    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top' as const },
        tooltip: {
          // 'index' (el usado en corrosion) asume el mismo índice en todos los datasets;
          // los 4 scatter tienen menos puntos que la línea (se filtran los nulos), así que
          // se usa 'nearest' + axis:'x' para encontrar el punto más cercano en esa columna.
          mode: 'nearest' as const,
          intersect: false,
          axis: 'x' as const,
          backgroundColor: '#1f3a52',
          padding: 12,
          titleColor: '#ffffff',
          bodyColor: '#ffffff',
          borderColor: '#2a4f6b',
          borderWidth: 1,
          cornerRadius: 6,
          titleFont: { size: 14, weight: 'bold' as const },
          bodyFont: { size: 13 },
          displayColors: true,
          callbacks: {
            title: (context: any) => this.formatAxisDate(context[0]?.parsed?.x),
            label: (context: any) => this.tooltipLabel(context),
          },
        },
      },
      scales: {
        x: {
          type: 'linear' as const,
          min: xMin,
          max: xMax,
          bounds: 'data' as const,
          ticks: {
            callback: (value: number | string) => this.formatAxisDate(Number(value)),
            maxRotation: 0,
            autoSkip: true,
          },
          grid: { color: '#eef2f7' },
        },
        y: {
          type: 'linear' as const,
          position: 'left' as const,
          min: 0,
          max: yMax,
          title: { display: true, text: 'THPS %' },
          ticks: { callback: (value: number | string) => `${value}%` },
        },
        y1: {
          type: 'linear' as const,
          position: 'right' as const,
          title: { display: true, text: 'log10(UFC/mL)' },
          grid: { drawOnChartArea: false },
        },
      },
    };
  });

  private primaryYMax(pts: TimelinePoint[]): number {
    const values = pts.map((p) => p.thpsPercent).filter((v): v is number => v != null);
    return Math.max(100, ...values, 0);
  }

  private tooltipLabel(context: any): string {
    const raw = context.raw ?? {};
    const label = context.dataset.label || '';

    if (label === 'Etapa de bacheo') {
      return `Etapa: ${raw.category}`;
    }

    if (raw.raw != null) {
      const log = Number(context.parsed.y).toFixed(2);
      return `${label}: ${Number(raw.raw).toLocaleString()} UFC/mL  (log10 ${log})`;
    }

    const value = context.parsed.y;
    const formatted = typeof value === 'number' ? value.toLocaleString() : value;
    return raw.category ? `${label}: ${formatted}  ·  Etapa: ${raw.category}` : `${label}: ${formatted}`;
  }

  private formatAxisDate(timestamp: number): string {
    if (!Number.isFinite(timestamp)) return '';
    const d = new Date(timestamp);
    const dd = String(d.getDate()).padStart(2, '0');
    return `${dd} ${MESES_CORTOS[d.getMonth()]} ${d.getFullYear()}`;
  }
}
