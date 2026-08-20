import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ChartModule } from 'primeng/chart';
import { MicrobiologyService } from '../../../../core/services/microbiology.service';
import { buildTimelinePoints } from './microbiology-timeline.transform';
import type { TimelinePoint } from './microbiology-timeline.transform';
import { buildBachePairs } from './microbiology-bache.transform';
import type {
  BacheEffectiveness,
  BachePair,
  MicroVariableKey,
} from './microbiology-bache.transform';

interface SeriesConfig {
  label: string;
  color: string;
  pointStyle: 'circle' | 'triangle' | 'rect' | 'rectRot';
}

type ControlKey =
  'bsrControlPercent' | 'bpaControlPercent' | 'bhtControlPercent' | 'bAntControlPercent';

interface ControlSeriesConfig {
  label: string;
  color: string;
}

// Mismos colores para bsr/bpa/bht/bant que ya usa thps-tolerance, para que la lectura sea
// consistente entre tabs aunque esta gráfica no importe ese archivo.
const SCATTER_SERIES: Record<MicroVariableKey, SeriesConfig> = {
  bsrPlanct: { label: 'BSR', color: '#1c4463', pointStyle: 'circle' },
  bpaPlanct: { label: 'BPA', color: '#e8590c', pointStyle: 'triangle' },
  bhtPlanct: { label: 'BHT', color: '#239a59', pointStyle: 'rect' },
  bAntPlanct: { label: 'BAnT', color: '#43474f', pointStyle: 'rectRot' },
};

const RESIDUAL_COLOR = '#9aa5b8';

// Mismos colores que SCATTER_SERIES para las variables equivalentes, así el % de control
// mensual se lee con la misma paleta que la gráfica de baches.
const CONTROL_SERIES: Record<ControlKey, ControlSeriesConfig> = {
  bsrControlPercent: { label: 'BSR', color: '#1c4463' },
  bpaControlPercent: { label: 'BPA', color: '#e8590c' },
  bhtControlPercent: { label: 'BHT', color: '#239a59' },
  bAntControlPercent: { label: 'BAnT', color: '#43474f' },
};

const MESES_CORTOS = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
];

interface BacheChart {
  pair: BachePair;
  data: { labels: string[]; datasets: unknown[] };
  options: Record<string, unknown>;
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

  // Umbral de residual THPS confirmado por el usuario (mismo % que ya se usaba como
  // referencia "Límite 20%" en la gráfica anterior de serie temporal).
  readonly RESIDUAL_MIN = 20;

  readonly legendItems: { label: string; color: string; shape: SeriesConfig['pointStyle'] }[] = [
    { label: 'BSR', color: SCATTER_SERIES.bsrPlanct.color, shape: 'circle' },
    { label: 'BPA', color: SCATTER_SERIES.bpaPlanct.color, shape: 'triangle' },
    { label: 'BHT', color: SCATTER_SERIES.bhtPlanct.color, shape: 'rect' },
    { label: 'BAnT', color: SCATTER_SERIES.bAntPlanct.color, shape: 'rectRot' },
    { label: 'Residual THPS', color: RESIDUAL_COLOR, shape: 'rect' },
  ];

  // --------------------- Gráfica superior: efecto Pre→Post por bache ---------------------
  readonly timelinePoints = computed<TimelinePoint[]>(() => buildTimelinePoints(this.records()));
  readonly bachePairs = computed<BachePair[]>(() => buildBachePairs(this.timelinePoints()));

  readonly bacheCharts = computed<BacheChart[]>(() =>
    this.bachePairs().map((pair, index) => ({
      pair,
      data: this.buildBacheLineData(pair),
      options: this.buildBacheLineOptions(index === 0),
    })),
  );

  readonly residualDomainMax = computed(() => {
    const values = this.bachePairs()
      .map((p) => this.residualValue(p))
      .filter((v): v is number => v != null);
    return Math.ceil(Math.max(30, ...values, 0) / 10) * 10;
  });

  readonly residualTicks = computed(() => {
    const max = this.residualDomainMax();
    return [max, (max * 2) / 3, max / 3, 0];
  });

  readonly residualThresholdTopPct = computed(() =>
    Math.max(0, 100 - (this.RESIDUAL_MIN / this.residualDomainMax()) * 100),
  );

  residualValue(pair: BachePair): number | null {
    return pair.postThpsPercent ?? pair.preThpsPercent;
  }

  residualBarHeightPct(pair: BachePair): number {
    const value = this.residualValue(pair);
    if (value == null) return 0;
    return Math.min(100, Math.max(0, (value / this.residualDomainMax()) * 100));
  }

  // null = sin dato de residual para este bache
  isResidualOk(pair: BachePair): boolean | null {
    const value = this.residualValue(pair);
    return value == null ? null : value >= this.RESIDUAL_MIN;
  }

  effectivenessText(pair: BachePair): string {
    const e = pair.effectiveness;
    if (e.kind === 'efectivo') {
      return e.minLog === e.maxLog
        ? `Efectivo · −${e.maxLog} log`
        : `Efectivo · −${e.minLog} a −${e.maxLog} log`;
    }
    if (e.kind === 'rebote') {
      return `Rebote en ${e.variables.map((k) => SCATTER_SERIES[k].label).join(', ')}`;
    }
    return 'Sin respuesta';
  }

  effectivenessClass(pair: BachePair): string {
    return `is-${this.effectivenessKind(pair.effectiveness)}`;
  }

  private effectivenessKind(e: BacheEffectiveness): string {
    return e.kind;
  }

  private buildBacheLineData(pair: BachePair): { labels: string[]; datasets: unknown[] } {
    const datasets = pair.variables.map((v) => {
      const cfg = SCATTER_SERIES[v.key];
      return {
        label: cfg.label,
        data: [v.preLog, v.postLog],
        borderColor: cfg.color,
        backgroundColor: cfg.color,
        pointBackgroundColor: cfg.color,
        pointStyle: cfg.pointStyle,
        pointRadius: 5,
        pointHoverRadius: 6,
        borderWidth: 2,
        tension: 0,
        spanGaps: true,
      };
    });

    return { labels: ['Pre', 'Post'], datasets };
  }

  private buildBacheLineOptions(showAxis: boolean): Record<string, unknown> {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1f3a52',
          padding: 10,
          titleColor: '#ffffff',
          bodyColor: '#ffffff',
          borderColor: '#2a4f6b',
          borderWidth: 1,
          cornerRadius: 6,
          callbacks: {
            label: (context: any) => {
              const value = context.parsed.y;
              return value == null
                ? `${context.dataset.label}: sin dato`
                : `${context.dataset.label}: ${Number(value).toFixed(1)} log10`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#6b7a99', font: { size: 11 } },
        },
        y: {
          min: 0,
          max: 6,
          grid: { color: '#eef2f7' },
          title: {
            display: showAxis,
            text: 'log10 (UFC/mL)',
            color: '#6b7a99',
            font: { size: 11 },
          },
          ticks: showAxis
            ? { stepSize: 1, color: '#6b7a99', font: { size: 11 } }
            : { display: false },
        },
      },
    };
  }

  // ------------------- Gráfica de control mensual (barras agrupadas) -------------------
  readonly monthlyControl = computed(() => this.review.value()?.monthlyControl ?? []);

  readonly monthlyControlChartData = computed(() => {
    const rows = this.monthlyControl();
    if (!rows.length) return { labels: [], datasets: [] };

    const labels = rows.map((r) => `${MESES_CORTOS[r.month - 1]} ${r.year}`);

    const datasets = (Object.keys(CONTROL_SERIES) as ControlKey[]).map((key) => {
      const cfg = CONTROL_SERIES[key];
      return {
        type: 'bar' as const,
        label: cfg.label,
        backgroundColor: cfg.color,
        data: rows.map((r) => r[key]),
      };
    });

    return { labels, datasets };
  });

  readonly monthlyControlChartOptions = {
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
        titleFont: { size: 14, weight: 'bold' as const },
        bodyFont: { size: 13 },
        displayColors: true,
        callbacks: {
          label: (context: any) => {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            return `${label}: ${value != null ? value + '%' : 'Sin datos'}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { color: '#eef2f7' },
      },
      y: {
        min: 0,
        max: 100,
        title: { display: true, text: '%' },
        ticks: { callback: (value: number | string) => `${value}%` },
      },
    },
    bar: {
      barPercentage: 0.8,
      categoryPercentage: 0.8,
    },
  };
}
