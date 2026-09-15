import { Component, computed, inject, LOCALE_ID, signal } from '@angular/core';
import { CommonModule, formatDate, formatNumber } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { ChartModule } from 'primeng/chart';
import { SliderModule } from 'primeng/slider';
import { OverviewService } from '../../../core/services/overview.service';
import { MicrobiologyKey, TankSummaryPeriod } from '../../../core/models/overview.model';
import { KpiCard, KpiAccent } from '../../../shared/components/kpi-card/kpi-card';
import { ChartFrame } from '../../../shared/charts/chart-frame/chart-frame';
import { MESES } from '../../../shared/charts/chart-dates';
import { chartToken, FWV_TOKEN } from '../../../shared/charts/chart-tokens';
import { applyChartDefaults } from '../../../shared/charts/chart-defaults';
import { createWindowState } from '../../../shared/charts/window-state';

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

@Component({
  selector: 'app-overview',
  imports: [CommonModule, FormsModule, ButtonModule, ChartModule, SliderModule, KpiCard, ChartFrame],
  templateUrl: './overview.html',
  styleUrl: './overview.css',
})
export class Overview {
  private readonly overviewService = inject(OverviewService);
  private readonly locale = inject(LOCALE_ID);

  readonly summary = this.overviewService.summary;

  // Expuesto al template para el `[max]` del slider de la ventana visible.
  protected readonly Math = Math;

  constructor() {
    applyChartDefaults();
  }

  readonly metrics = computed<OverviewMetric[]>(() => {
    const data = this.summary.value();
    const resume = data?.summary;
    console.log(data);
    if (!resume) return [];

    const periodicity = resume.periodicity;

    return [
      {
        title: 'Cumplimiento de Periodicidad Contractual ',
        value: this.formatCompliancePercent(periodicity?.compliancePercent),
        unit: '%',
        subtitle:
          periodicity?.executed != null && periodicity?.target != null
            ? `${periodicity.executed} visitas de ${periodicity.target} programadas`
            : 'Periodicidad contractual vs Periodicidad actual',
        icon: 'fa-regular fa-calendar-check',
        color: 'warning',
      },
      {
        title: 'DIFERENCIA DE DOSIS OFERTADA VS INYECTADA',
        value: resume.dose?.executed != null && resume.dose?.target != null
            ? `${formatNumber(Math.abs(resume.dose.executed - resume.dose.target), this.locale, '1.0-2')}`
            : null,
        unit: 'ppm',
        subtitle:
          resume.dose?.executed != null && resume.dose?.target != null
            ? `${formatNumber(resume.dose.executed, this.locale, '1.0-2')} ejecutados de ${formatNumber(resume.dose.target, this.locale, '1.0-2')} programado`
            : 'Dosis ofertada vs Dosis inyectada',
        icon: 'fa-solid fa-eye-dropper',
        color: 'info',
      },
      {
        title: 'DIFERENCIA DE GALONES ESTIMADOS VS INYECTADOS',
        value: resume.volume?.executed != null && resume.volume?.target != null
            ? `${formatNumber(Math.abs(resume.volume.executed - resume.volume.target), this.locale, '1.0-2')}`
            : null,
        unit: 'gal',
        subtitle:
          resume.volume?.executed != null && resume.volume?.target != null
            ? `${formatNumber(resume.volume.executed, this.locale, '1.0-2')} inyectados de ${formatNumber(resume.volume.target, this.locale, '1.0-2')} programado`
            : 'Galones estimados vs Galones inyectados',
        icon: 'fa-solid fa-jar',
        color: 'danger',
      },
      {
        title: 'CUMPLIMIENTO CONTROL MICROBIOLÓGICO',
        value: data?.microbiology?.controlPercent ?? null,
        unit: '%',
        subtitle: 'Mediciones < 10² Bact/mL',
        icon: 'fa-solid fa-vial-virus',
        color: 'success',
      },
    ];
  });

  // Regla de negocio: el backend puede devolver cumplimientos > 100% (p. ej. dosis
  // inyectada muy por encima de la ofertada); se acota visualmente a ">100" y, por
  // debajo del límite, se deja pasar el valor numérico tal como lo envía el backend.
  private formatCompliancePercent(percent: number | null | undefined): string | number | null {
    if (percent == null) return null;
    return percent > 100 ? '>100' : percent;
  }

  // ----------------------------- Gráfica 1: FWV reportada vs. calculada -----------------------------
  // Mismo lenguaje visual que la gráfica de dosificación: una barra por serie y mes.
  // Colores por token de dominio FWV (mismos que corrosion/thps-tolerance). Leyenda nativa arriba.
  readonly fwvChart = computed(() => {
    const months = this.summary.value()?.freeWater?.months ?? [];
    return {
      labels: months.map((m) => `${MESES[m.month - 1]} ${m.year}`),
      datasets: [
        {
          label: 'FWV reportada',
          backgroundColor: chartToken(FWV_TOKEN.reportada),
          borderWidth: 0,
          borderRadius: 2,
          maxBarThickness: 46,
          data: months.map((m) => m.reportedMean),
        },
        {
          label: 'FWV calculada',
          backgroundColor: chartToken(FWV_TOKEN.calculada),
          borderWidth: 0,
          borderRadius: 2,
          maxBarThickness: 46,
          data: months.map((m) => m.calculatedMean),
        },
      ],
    };
  });

  // Subtítulo de la cabecera de la gráfica.
  readonly fwvSubtitle = computed(() => {
    return `Comparativa mensual de FWV (bls)`;
  });

  // Ventana visible (scroll horizontal): la gráfica recibe SIEMPRE todos los meses; el slider
  // solo desplaza el rango de índices dibujado (scales.x.min/max), como en corrosion/physicochemistry.
  protected readonly fwvLabels = computed(() => this.fwvChart().labels);
  protected readonly fwvWindow = createWindowState(
    computed(() => this.fwvLabels().length),
    12,
  );

  readonly fwvOptions = computed(() =>
    this.buildBarOptions('FWV (bls)', { xRange: this.fwvWindow.range() }),
  );

  // Cuadro-resumen al pie de la gráfica de FWV: valores agregados del periodo que entrega
  // el backend en `freeWater` (no derivados en frontend).
  readonly fwvStats = computed<ChartStat[]>(() => {
    const fw = this.summary.value()?.freeWater;
    if (!fw) return [];
    return [
      {
        label: 'Cumplimiento global',
        value: fw.globalCompliancePercent,
        unit: 'Mediciones',
        format: '1.0-1',
      },
      { label: 'Brecha FWV línea base vs FWV Calculado', value: fw.targetWater, unit: 'bls', format: '1.0-1' },
      {
        label: 'Brecha FWV Reportado vs. FWV Calculado',
        value: fw.reportedCalculatedGap,
        unit: 'bls',
        format: '1.0-1',
      },
      {
        label: 'FWV calculado acumulado',
        value: fw.accumulatedCalculatedWater,
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
      { label: 'Cumplimiento global', value: d.globalCompliancePercent, unit: 'Mediciones', format: '1.0-1' },
      { label: 'Brecha Dosis Linea Base vs Ejecutado', value: d.targetDose, unit: 'ppm', format: '1.0-1' },
      { label: 'Brecha Volumen Linea Base vs Ejecutado', value: d.targetVolumen, unit: 'gal', format: '1.0-0' },
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

  // ----------------------------- Condiciones contractuales vs. ejecutado (AnnualSummary) -----------------------------
  // Tabla al lado de las gráficas de FWV/dosificación: una fila por año (condiciones pactadas)
  // que se expande a su detalle mensual ejecutado (`annualSummary.periodos[].ejecutado`).
  readonly annualSummary = computed(() => this.summary.value()?.annualSummary ?? null);

  readonly annualPeriods = computed<TankSummaryPeriod[]>(() =>
    [...(this.annualSummary()?.periodos ?? [])].sort((a, b) => a.anio - b.anio),
  );

  // Años con el detalle mensual desplegado; vacío por defecto (todo colapsado).
  private readonly expandedYears = signal<ReadonlySet<number>>(new Set());

  isYearExpanded(anio: number): boolean {
    return this.expandedYears().has(anio);
  }

  toggleYear(anio: number): void {
    this.expandedYears.update((years) => {
      const next = new Set(years);
      next.has(anio) ? next.delete(anio) : next.add(anio);
      return next;
    });
  }

  // 'yyyy-MM' -> 'Enero'. `mes` no trae día: se construye con día 1 (evita el bug de zona
  // horaria de parsear fecha-sola con `new Date(string)`, ver chart-dates.ts).
  mesLabel(mes: string): string {
    const [year, month] = mes.split('-').map(Number);
    const label = formatDate(new Date(year, (month || 1) - 1, 1), 'MMMM', this.locale);
    return label.charAt(0).toUpperCase() + label.slice(1);
  }

  // Formato numérico con '—' para null/undefined; centraliza el manejo de los campos
  // `decimal?` del backend en esta tabla (bls, ppm, galones, periodicidad).
  numOrDash(value: number | null | undefined, format = '1.0-0'): string {
    return value == null ? '—' : formatNumber(value, this.locale, format);
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
      /** Fuerza el tope del eje Y (deja margen por encima del valor más alto esperado). */
      suggestedMax?: number;
      /** Plugins locales con sus opciones. */
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
