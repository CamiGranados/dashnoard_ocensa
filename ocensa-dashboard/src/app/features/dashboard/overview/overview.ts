import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { ChartModule } from 'primeng/chart';
import { OverviewService } from '../../../core/services/overview.service';
import { MicrobiologyKey } from '../../../core/models/overview.model';
import { KpiCard, KpiAccent } from '../../../shared/components/kpi-card/kpi-card';
import { ChartLegend, ChartLegendItem } from '../../../shared/charts/chart-legend/chart-legend';
import { MESES } from '../../../shared/charts/chart-dates';
import { chartToken } from '../../../shared/charts/chart-tokens';
import { applyChartDefaults } from '../../../shared/charts/chart-defaults';
import { toleranceLinePlugin } from './overview-tolerance-line.plugin';

interface OverviewMetric {
  title: string;
  value: string | number | null;
  unit: string;
  subtitle: string;
  icon: string;
  color: KpiAccent;
}

// Etiqueta corta + descripción para las filas del grid de microbiología.
const MICRO_LABELS: Record<MicrobiologyKey, { short: string; long: string }> = {
  BSR: { short: 'BSR', long: 'Sulfato reductoras' },
  BPA: { short: 'BPA', long: 'Productoras de ácido' },
  BHT: { short: 'BHT', long: 'Heterótrofas totales' },
  BAnT: { short: 'BAnT', long: 'Anaerobias totales' },
};

// Tolerancia provisional para la desviación de FWV (mismo criterio que la imagen de referencia).
// TODO(backend): reemplazar por el valor real cuando el API lo entregue.
const FWV_TOLERANCE_BBL = 300;

@Component({
  selector: 'app-overview',
  imports: [CommonModule, ButtonModule, ChartModule, KpiCard, ChartLegend],
  templateUrl: './overview.html',
  styleUrl: './overview.css',
})
export class Overview {
  private readonly overviewService = inject(OverviewService);

  readonly summary = this.overviewService.summary;

  constructor() {
    applyChartDefaults();
  }

  readonly metrics = computed<OverviewMetric[]>(() => {
    const data = this.summary.value();
    const resume = data?.summary;

    if (!resume) return [];

    return [
      {
        title: 'RETENCIÓN MEDIANA DE THPS',
        value: resume.thpsMedian?.toFixed(2) ?? '—',
        unit: '%',
        subtitle: 'Referencia contractual: ≥ 20%',
        icon: 'fa-solid fa-jar',
        color: 'danger',
      },
      {
        title: 'EVENTOS MICROBIOLÓGICOS EN CONTROL',
        value: String(resume.bsrInControlCount),
        unit: '%',
        subtitle: '685 de 1.238 eventos con dato',
        icon: 'fa-solid fa-vial-virus',
        color: 'success',
      },
      {
        title: 'ÚLTIMA CATEGORÍA NACE',
        value: resume.categoryNace,
        unit: '',
        subtitle: 'TQ55000 · 19 de may de 2026',
        icon: 'fa-regular fa-circle-check',
        color: 'warning',
      },
      {
        title: 'ÍNDICE CENTINELA MÁS RECIENTE',
        value: resume.levelAlarm,
        unit: '',
        subtitle: 'TQ55000 · 20 de nov de 2024',
        icon: 'fa-solid fa-droplet',
        color: 'info',
      },
    ];
  });

  // ----------------------------- Gráfica 1: desviación FWV reportada vs. calculada -----------------------------
  // Estilo de la vista ejecutiva: una barra por mes con la magnitud de la desviación
  // |reportada − calculada| y una línea de tolerancia contractual punteada. Las barras
  // que la exceden van en rojo (relleno claro + contorno). Leyenda HTML propia.
  readonly fwvChart = computed(() => {
    const months = this.summary.value()?.freeWater?.months ?? [];
    const values = months.map((m) => Math.abs(m.deviation));
    const exceeds = values.map((v) => v > FWV_TOLERANCE_BBL);

    const withinColor = chartToken('--chart-fwv-en-tolerancia');
    const exceedFill = chartToken('--chart-fwv-fuera-tolerancia-fill');
    const exceedBorder = chartToken('--chart-fwv-fuera-tolerancia');

    return {
      labels: months.map((m) => `${MESES[m.month - 1]} ${m.year}`),
      datasets: [
        {
          label: 'Desviación mensual',
          data: values,
          backgroundColor: exceeds.map((e) => (e ? exceedFill : withinColor)),
          borderColor: exceeds.map((e) => (e ? exceedBorder : withinColor)),
          borderWidth: exceeds.map((e) => (e ? 1.5 : 0)),
          borderSkipped: false,
          borderRadius: 2,
          maxBarThickness: 46,
        },
      ],
    };
  });

  readonly fwvOptions = this.buildBarOptions('Desviación (BBL)', {
    suggestedMax: FWV_TOLERANCE_BBL * 1.2,
    plugins: {
      toleranceLine: {
        value: FWV_TOLERANCE_BBL,
        label: `Tolerancia ${FWV_TOLERANCE_BBL}`,
        color: chartToken('--chart-fwv-fuera-tolerancia'),
      },
    },
    tooltipLabel: (ctx) => ` Desviación: ${ctx.parsed.y.toFixed(0)} BBL`,
  });

  readonly fwvPlugins = [toleranceLinePlugin];

  readonly fwvLegend: ChartLegendItem[] = [
    {
      label: 'Desviación mensual',
      color: chartToken('--chart-fwv-en-tolerancia'),
      shape: 'circle',
    },
    {
      label: `Tolerancia contractual (±${FWV_TOLERANCE_BBL} BBL)`,
      color: chartToken('--chart-fwv-fuera-tolerancia'),
      shape: 'circle',
    },
  ];

  // ----------------------------- Gráfica 2: dosificación programada vs. inyectada -----------------------------
  // Mismo lenguaje visual que la gráfica de FWV: "Programada" (objetivo) en naranja con
  // relleno claro + contorno; "Inyectada" (medida real) en azul sólido. Leyenda HTML propia.
  readonly doseChart = computed(() => {
    const months = this.summary.value()?.dose?.months ?? [];
    return {
      labels: months.map((m) => `${MESES[m.month - 1]} ${m.year}`),
      datasets: [
        {
          // Unificado con thps-tolerance: mismo color para la misma variable de dominio.
          label: 'Programada',
          backgroundColor: chartToken('--chart-dosis-programada-fill'),
          borderColor: chartToken('--chart-dosis-programada'),
          borderWidth: 1.5,
          borderSkipped: false,
          borderRadius: 2,
          maxBarThickness: 46,
          data: months.map((m) => m.scheduledMean),
        },
        {
          label: 'Inyectada',
          backgroundColor: chartToken('--chart-dosis-real'),
          borderWidth: 0,
          borderRadius: 2,
          maxBarThickness: 46,
          data: months.map((m) => m.injectedMean),
        },
      ],
    };
  });

  readonly doseOptions = this.buildBarOptions('Dosis');

  readonly doseLegend: ChartLegendItem[] = [
    {
      label: 'Programada',
      color: chartToken('--chart-dosis-programada'),
      shape: 'circle',
    },
    {
      label: 'Inyectada',
      color: chartToken('--chart-dosis-real'),
      shape: 'circle',
    },
  ];

  // ----------------------------- Gráfica 3: resumen de control microbiológico (grid) -----------------------------
  // Una fila por variable (BSR/BPA/BHT/BAnT) + fila "Todas las variables". Una columna por mes,
  // desde el primer dato hasta el mes en curso. Cada celda: `totalCount` puntos, `inControlCount`
  // en verde (dentro de 10² Bact/mL), el resto en rojo.
  readonly microGrid = computed(() => {
    const micro = this.summary.value()?.microbiology;
    if (!micro) return null;

    const keys = new Set<number>();
    for (const v of micro.variables) {
      for (const c of v.months) keys.add(this.monthKey(c.year, c.month));
    }
    for (const t of micro.monthlyTotals) keys.add(this.monthKey(t.year, t.month));
    if (keys.size === 0) return null;

    const sorted = [...keys].sort((a, b) => a - b);
    const now = new Date();
    const nowKey = now.getFullYear() * 12 + now.getMonth();
    const lastData = sorted[sorted.length - 1];
    // Se extiende hasta el mes en curso, pero como máximo 3 meses vacíos de cola.
    const end = Math.min(Math.max(lastData, nowKey), lastData + 3);

    const columns: { key: number; label: string; isCurrent: boolean }[] = [];
    for (let k = sorted[0]; k <= end; k++) {
      columns.push({ key: k, label: this.monthLabel(k), isCurrent: k === nowKey });
    }

    const rows = micro.variables.map((v) => {
      const meta = MICRO_LABELS[v.key];
      const cells = columns.map((col) => {
        const cell = v.months.find((c) => this.monthKey(c.year, c.month) === col.key);
        if (!cell || cell.totalCount === 0) {
          return { sampled: false, ok: 0, total: 0 };
        }
        return { sampled: true, ok: cell.inControlCount, total: cell.totalCount };
      });
      return { key: v.key, short: meta.short, long: meta.long, controlPercent: v.controlPercent, cells };
    });

    const totalCells = columns.map((col) => {
      const t = micro.monthlyTotals.find((mt) => this.monthKey(mt.year, mt.month) === col.key);
      return t && t.totalCount > 0
        ? { sampled: true, ok: t.inControlCount, total: t.totalCount, percent: t.controlPercent }
        : { sampled: false, ok: 0, total: 0, percent: null as number | null };
    });

    return {
      columns,
      rows,
      totalCells,
      controlPercent: micro.controlPercent,
      inControl: micro.inControlCount,
      total: micro.totalCount,
    };
  });

  // Array de banderas para pintar los puntos de una celda (true = dentro de límite).
  dots(ok: number, total: number): boolean[] {
    return Array.from({ length: total }, (_, i) => i < ok);
  }

  // Clase de color para un porcentaje de control.
  pctClass(percent: number | null): string {
    if (percent == null) return '';
    if (percent >= 80) return 'is-ok';
    if (percent >= 40) return 'is-warn';
    return 'is-bad';
  }

  private monthKey(year: number, month: number): number {
    return year * 12 + (month - 1);
  }

  private monthLabel(key: number): string {
    const year = Math.floor(key / 12);
    const month = key % 12;
    return `${MESES[month].toLowerCase()}/${String(year).slice(-2)}`;
  }

  // Opciones compartidas de las barras de la vista ejecutiva: sin leyenda nativa (las dos
  // gráficas usan <app-chart-legend>), tooltip por índice. El cromo (tooltip, grid, ejes,
  // maintainAspectRatio) vive en Chart.defaults (chart-defaults.ts).
  private buildBarOptions(
    yTitle: string,
    opts: {
      /** Fuerza el tope del eje Y (p. ej. para que la línea de tolerancia siempre se vea). */
      suggestedMax?: number;
      /** Plugins locales con sus opciones (p. ej. toleranceLine). */
      plugins?: Record<string, unknown>;
      /** Callback `label` del tooltip. */
      tooltipLabel?: (ctx: { parsed: { y: number } }) => string;
    } = {},
  ) {
    return {
      responsive: true,
      animation: false as const,
      plugins: {
        legend: { display: false },
        tooltip: {
          mode: 'index' as const,
          intersect: false,
          titleFont: { size: 13, weight: 'bold' },
          bodyFont: { size: 12 },
          ...(opts.tooltipLabel ? { callbacks: { label: opts.tooltipLabel } } : {}),
        },
        ...(opts.plugins ?? {}),
      },
      scales: {
        x: { ticks: { maxRotation: 0, autoSkip: true } },
        y: {
          beginAtZero: true,
          suggestedMax: opts.suggestedMax,
          title: { display: true, text: yTitle },
        },
      },
    };
  }

  exportarCSV(): void {
    console.log('Exportar CSV');
  }

  exportarPDF(): void {
    console.log('Exportar PDF');
  }
}
