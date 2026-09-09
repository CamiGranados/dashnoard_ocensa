import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { ChartModule } from 'primeng/chart';
import { SliderModule } from 'primeng/slider';
import { OverviewService } from '../../../core/services/overview.service';
import { MicrobiologyKey } from '../../../core/models/overview.model';
import { KpiCard, KpiAccent } from '../../../shared/components/kpi-card/kpi-card';
import { ChartFrame } from '../../../shared/charts/chart-frame/chart-frame';
import { MESES } from '../../../shared/charts/chart-dates';
import { chartToken } from '../../../shared/charts/chart-tokens';
import { applyChartDefaults } from '../../../shared/charts/chart-defaults';
import { createWindowState } from '../../../shared/charts/window-state';
import { toleranceLinePlugin } from './overview-tolerance-line.plugin';

interface OverviewMetric {
  title: string;
  value: string | number | null;
  unit: string;
  subtitle: string;
  icon: string;
  color: KpiAccent;
}

// Celda del cuadro-resumen que va al pie de las gráficas de FWV y dosificación
// (mismo lenguaje visual que la tira de estadísticas de la gráfica de corrosión).
interface ChartStat {
  label: string;
  value: number | null;
  unit: string;
  /** Formato para el pipe `number` (p. ej. '1.0-1'). */
  format: string;
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
  imports: [CommonModule, FormsModule, ButtonModule, ChartModule, SliderModule, KpiCard, ChartFrame],
  templateUrl: './overview.html',
  styleUrl: './overview.css',
})
export class Overview {
  private readonly overviewService = inject(OverviewService);

  readonly summary = this.overviewService.summary;

  // Expuesto al template para el `[max]` del slider de la ventana visible.
  protected readonly Math = Math;

  constructor() {
    applyChartDefaults();
  }

  readonly metrics = computed<OverviewMetric[]>(() => {
    const data = this.summary.value();
    const resume = data?.summary;
    console.log(data)
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
  // que la exceden van en rojo (relleno claro + contorno). Leyenda nativa arriba (toggle de series).
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

  // Subtítulo de la cabecera de la gráfica (patrón de la imagen de referencia): descripción
  // + rango de meses de los datos.
  readonly fwvSubtitle = computed(() => {
    const labels = this.fwvChart().labels;
    return `Diferencia absoluta mensual (bls)`;
  });

  // Ventana visible (scroll horizontal): la gráfica recibe SIEMPRE todos los meses; el slider
  // solo desplaza el rango de índices dibujado (scales.x.min/max), como en corrosion/physicochemistry.
  protected readonly fwvLabels = computed(() => this.fwvChart().labels);
  protected readonly fwvWindow = createWindowState(
    computed(() => this.fwvLabels().length),
    12,
  );

  readonly fwvOptions = computed(() =>
    this.buildBarOptions('Desviación (bls)', {
      suggestedMax: FWV_TOLERANCE_BBL * 1.2,
      xRange: this.fwvWindow.range(),
      plugins: {
        toleranceLine: {
          value: FWV_TOLERANCE_BBL,
          label: `Tolerancia ${FWV_TOLERANCE_BBL}`,
          color: chartToken('--chart-fwv-fuera-tolerancia'),
        },
      },
      tooltipLabel: (ctx) => ` Desviación: ${ctx.parsed.y.toFixed(0)} bls`,
      // La serie usa colores por barra (array), así que forzamos el swatch de la leyenda a un
      // color único y añadimos una entrada informativa (no interactiva) para la línea de tolerancia.
      legend: {
        ...this.baseLegend(),
        labels: {
          ...this.baseLegend().labels,
          generateLabels: (chart: any) => [
            {
              text: 'Desviación mensual',
              fillStyle: chartToken('--chart-fwv-en-tolerancia'),
              strokeStyle: chartToken('--chart-fwv-en-tolerancia'),
              hidden: chart.getDatasetMeta(0).hidden ?? false,
              datasetIndex: 0,
            },
            {
              text: `Tolerancia contractual (±${FWV_TOLERANCE_BBL} BBL)`,
              fillStyle: chartToken('--chart-fwv-fuera-tolerancia'),
              strokeStyle: chartToken('--chart-fwv-fuera-tolerancia'),
              lineDash: [4, 3],
              hidden: false,
              datasetIndex: -1,
            },
          ],
        },
        onClick: (_e: any, item: any, legend: any) => {
          if (item.datasetIndex == null || item.datasetIndex < 0) return;
          const meta = legend.chart.getDatasetMeta(item.datasetIndex);
          meta.hidden = meta.hidden === null ? true : !meta.hidden;
          legend.chart.update();
        },
      },
    }),
  );

  readonly fwvPlugins = [toleranceLinePlugin];

  // Cuadro-resumen al pie de la gráfica de FWV: valores agregados del periodo que entrega
  // el backend en `freeWater` (no derivados en frontend).
  readonly fwvStats = computed<ChartStat[]>(() => {
    const fw = this.summary.value()?.freeWater;
    if (!fw) return [];
    return [
      { label: 'Desviación media', value: fw.meanDeviation, unit: 'bls', format: '1.0-1' },
      { label: 'Desviación estándar', value: fw.stdDeviation, unit: 'bls', format: '1.0-1' },
      { label: 'Fuera de tolerancia', value: fw.outOfTolerancePercent, unit: '%', format: '1.0-1' },
      {
        label: 'Agua incrementada acumulada',
        value: fw.accumulatedIncreasedWater,
        unit: 'bls',
        format: '1.0-0',
      },
    ];
  });

  // ----------------------------- Gráfica 2: dosificación programada vs. inyectada -----------------------------
  // Mismo lenguaje visual que la gráfica de FWV: "Programada" (objetivo) en naranja con
  // relleno claro + contorno; "Inyectada" (medida real) en azul sólido. Leyenda nativa arriba (toggle de series).
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

  readonly doseSubtitle = computed(() => {
    return `Comparativa mensual de dosis (ppm)`;
  });

  protected readonly doseLabels = computed(() => this.doseChart().labels);
  protected readonly doseWindow = createWindowState(
    computed(() => this.doseLabels().length),
    12,
  );

  readonly doseOptions = computed(() =>
    this.buildBarOptions('Dosis (ppm)', { xRange: this.doseWindow.range() }),
  );

  // Cuadro-resumen al pie de la gráfica de dosificación. OJO: estas métricas comparan el
  // VOLUMEN programado vs. real inyectado (en galones), no la dosis media de las barras.
  readonly doseStats = computed<ChartStat[]>(() => {
    const d = this.summary.value()?.dose;
    if (!d) return [];
    return [
      { label: 'Cumplimiento global', value: d.globalCompliancePercent, unit: '%', format: '1.0-1' },
      { label: 'Desviación de volumen', value: d.deviationPercent, unit: '%', format: '1.0-1' },
      { label: 'Fuera de tolerancia', value: d.outOfToleranceCount, unit: '', format: '1.0-0' },
      {
        label: 'Volumen real inyectado acumulado',
        value: d.accumulatedActualVolume,
        unit: 'gal',
        format: '1.0-0',
      },
    ];
  });

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

  // Leyenda nativa de Chart.js arriba (misma configuración que corrosion/physicochemistry/thps):
  // muestra las series y permite ocultarlas al hacer clic.
  private baseLegend() {
    return {
      position: 'top' as const,
      labels: {
        boxWidth: 10,
        boxHeight: 10,
        color: chartToken('--color-gray-dark'),
        font: { size: 11 },
      },
    };
  }

  // Opciones compartidas de las barras de la vista ejecutiva: leyenda nativa arriba, tooltip por
  // índice. El cromo (tooltip, grid, ejes, maintainAspectRatio) vive en Chart.defaults (chart-defaults.ts).
  private buildBarOptions(
    yTitle: string,
    opts: {
      /** Fuerza el tope del eje Y (p. ej. para que la línea de tolerancia siempre se vea). */
      suggestedMax?: number;
      /** Plugins locales con sus opciones (p. ej. toleranceLine). */
      plugins?: Record<string, unknown>;
      /** Callback `label` del tooltip. */
      tooltipLabel?: (ctx: { parsed: { y: number } }) => string;
      /** Override de la config de leyenda (p. ej. generateLabels a medida). */
      legend?: Record<string, unknown>;
      /** Rango de índices `[inicio, fin]` visible (ventana / scroll horizontal). */
      xRange?: readonly [number, number];
    } = {},
  ) {
    return {
      responsive: true,
      animation: false as const,
      plugins: {
        legend: opts.legend ?? this.baseLegend(),
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
        x: {
          type: 'category' as const,
          ...(opts.xRange ? { min: opts.xRange[0], max: opts.xRange[1] } : {}),
          ticks: { maxRotation: 0, autoSkip: true },
        },
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
