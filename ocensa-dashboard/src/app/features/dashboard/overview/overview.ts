import { Component, computed, effect, inject, LOCALE_ID, signal } from '@angular/core';
import { CommonModule, formatDate, formatNumber } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { ChartModule } from 'primeng/chart';
import { SliderModule } from 'primeng/slider';
import { DialogModule } from 'primeng/dialog';
import { OverviewService } from '../../../core/services/overview.service';
import { FiltersStateService } from '../../../core/services/filters-state.service';
import { PhysicochemistryService } from '../../../core/services/physicochemistry.service';
import { MicrobiologyKey, TankSummaryEjecutado, TankSummaryPeriod } from '../../../core/models/overview.model';
import { PhysicalChemistryRecord } from '../../../core/models/physicochemistry.model';
import { KpiCard, KpiAccent } from '../../../shared/components/kpi-card/kpi-card';
import { ChartFrame } from '../../../shared/charts/chart-frame/chart-frame';
import { formatFullDate, MESES } from '../../../shared/charts/chart-dates';
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

// ----------------------------- Gráfica 4: tasa de corrosión / velocidad de picadura -----------------------------
// Copia de la gráfica principal de physicochemistry.ts (mismo servicio, misma config de series):
// es la misma variable de negocio, solo se muestra también en la vista ejecutiva.
type CorrosionSeriesKey =
  | 'generalCorrosionRate'
  | 'corrosionRateMean'
  | 'maximumStingSpeed'
  | 'maximumStingMean';

const CORROSION_SERIES_CONFIG: Record<CorrosionSeriesKey, {
  label: string;
  axis: 'y' | 'y1';
  defaultType: 'line' | 'bar';
  color: string;
  fill?: string;
}> = {
  generalCorrosionRate: { label: 'Tasa de corrosión general', axis: 'y', defaultType: 'bar', color: '--chart-fq-corrosion-rate' },
  corrosionRateMean: { label: 'Media tasa de corrosión', axis: 'y', defaultType: 'line', color: '--chart-fq-corrosion-rate', fill: '--chart-fq-corrosion-rate-fill' },
  maximumStingSpeed: { label: 'Velocidad máxima de picadura', axis: 'y1', defaultType: 'bar', color: '--chart-fq-pitting-speed' },
  maximumStingMean: { label: 'Media velocidad de picadura', axis: 'y1', defaultType: 'line', color: '--chart-fq-pitting-speed-mean', fill: '--chart-fq-pitting-speed-fill' },
};

// Página de calendario (1 año si el histórico cabe en uno, si no bloques de 6) para la
// paginación de la gráfica principal — igual que mainPages en physicochemistry.ts.
interface CorrosionYearPage {
  startYear: number;
  endYear: number;
  start: number;
  end: number;
}

@Component({
  selector: 'app-overview',
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    ChartModule,
    SliderModule,
    DialogModule,
    KpiCard,
    ChartFrame,
  ],
  templateUrl: './overview.html',
  styleUrl: './overview.css',
})
export class Overview {
  private readonly overviewService = inject(OverviewService);
  private readonly filtersState = inject(FiltersStateService);
  private readonly physicochemistryService = inject(PhysicochemistryService);
  private readonly locale = inject(LOCALE_ID);

  readonly summary = this.overviewService.summary;

  // Expuesto al template para el `[max]` del slider de la ventana visible.
  protected readonly Math = Math;

  constructor() {
    applyChartDefaults();

    // Maquinaria B (igual que physicochemistry.ts): al llegar datos nuevos, la gráfica de
    // corrosión salta a la última página de año.
    effect(() => {
      const total = this.sortedCorrosionRecords().length;
      this.corrosionPageIndex.set(total === 0 ? 0 : Math.max(0, this.corrosionPages().length - 1));
    });
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
  // Mismo lenguaje visual que la gráfica de dosificación: barras con relleno pastel + borde.
  // Colores por token de dominio FWV (mismos que corrosion/thps-tolerance para el borde; el
  // relleno pastel es exclusivo de esta vista). Leyenda nativa arriba.
  readonly fwvChart = computed(() => {
    const months = this.summary.value()?.freeWater?.months ?? [];
    return {
      labels: months.map((m) => `${MESES[m.month - 1]} ${m.year}`),
      datasets: [
        {
          label: 'FWV reportada',
          backgroundColor: chartToken('--chart-fwv-reportada-fill'),
          borderColor: chartToken(FWV_TOKEN.reportada),
          borderWidth: 1.5,
          borderSkipped: false,
          borderRadius: 2,
          maxBarThickness: 46,
          data: months.map((m) => m.reportedMean),
        },
        {
          label: 'FWV calculada',
          backgroundColor: chartToken('--chart-fwv-calculada-fill'),
          borderColor: chartToken(FWV_TOKEN.calculada),
          borderWidth: 1.5,
          borderSkipped: false,
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

  // ----------------------------- Gráfica 4: tasa de corrosión / velocidad de picadura -----------------------------
  // Reutiliza PhysicochemistryService (mismo singleton/caché que consume el tab physicochemistry;
  // se pide con los mismos filtros globales tanque/años/meses, sin llamada HTTP nueva).
  readonly corrosionReview = this.physicochemistryService.review;

  readonly corrosionRecords = computed(() => this.corrosionReview.value()?.data ?? []);

  readonly sortedCorrosionRecords = computed<PhysicalChemistryRecord[]>(() =>
    this.corrosionRecords().slice().sort((a, b) => a.date.localeCompare(b.date)),
  );

  readonly corrosionSubtitle = computed(() => {
    const recs = this.sortedCorrosionRecords();
    if (recs.length < 2) return 'Media móvil y valores por evento';
    return `Media móvil y valores por evento · ${this.corrosionMonthYear(recs[0].date)} – ${this.corrosionMonthYear(recs[recs.length - 1].date)}`;
  });

  // La gráfica recibe SIEMPRE todo el histórico con fechas reales (eje X lineal); se pagina por
  // año calendario (1 año si cabe, si no bloques de 6) — igual que mainPages en physicochemistry.ts.
  readonly corrosionPages = computed<CorrosionYearPage[]>(() => {
    const records = this.sortedCorrosionRecords();
    if (!records.length) return [];

    const minYear = new Date(records[0].date).getFullYear();
    const maxYear = new Date(records[records.length - 1].date).getFullYear();
    const pageSizeYears = maxYear - minYear + 1 <= 1 ? 1 : 6;

    const pages: CorrosionYearPage[] = [];
    let end = maxYear;
    while (end >= minYear) {
      const start = Math.max(minYear, end - pageSizeYears + 1);
      pages.push({
        startYear: start,
        endYear: end,
        start: new Date(start, 0, 2).getTime(),
        end: new Date(end + 1, 0, 1).getTime() - 1,
      });
      end = start - 1;
    }

    return pages.reverse();
  });

  corrosionPageIndex = signal(0);

  readonly corrosionPage = computed<CorrosionYearPage | null>(() => {
    const pages = this.corrosionPages();
    return pages[this.corrosionPageIndex()] ?? pages[pages.length - 1] ?? null;
  });

  private static corrosionDomainOf(values: number[]): { min: number; max: number } {
    if (!values.length) return { min: 0, max: 1 };
    const min = Math.min(...values);
    const max = Math.max(...values);
    const pad = (max - min) * 0.1 || 1;
    return { min: Math.max(0, min - pad), max: max + pad };
  }

  // Dominio fijo por eje, calculado una sola vez sobre TODO el histórico: así el eje Y no se
  // reescala al cambiar de página.
  private readonly corrosionYDomain = computed(() =>
    Overview.corrosionDomainOf(
      this.sortedCorrosionRecords()
        .flatMap((r) => [r.generalCorrosionRate, r.corrosionRateMean])
        .filter((v): v is number => v != null),
    ),
  );

  private readonly corrosionY1Domain = computed(() =>
    Overview.corrosionDomainOf(
      this.sortedCorrosionRecords()
        .flatMap((r) => [r.maximumStingSpeed, r.maximumStingMean])
        .filter((v): v is number => v != null),
    ),
  );

  readonly corrosionChartData = computed(() => {
    const records = this.sortedCorrosionRecords();
    if (!records.length) return { datasets: [] };

    const datasets = (Object.keys(CORROSION_SERIES_CONFIG) as CorrosionSeriesKey[]).map((key) => {
      const cfg = CORROSION_SERIES_CONFIG[key];
      const isBar = cfg.defaultType === 'bar';
      // Serie "media": área rellena + marcadores de círculo hueco (ver CORROSION_SERIES_CONFIG.fill).
      const isMean = !isBar && !!cfg.fill;
      const color = chartToken(cfg.color);

      return {
        type: cfg.defaultType,
        label: cfg.label,
        yAxisID: cfg.axis,
        borderColor: isBar ? chartToken('--color-white') : color,
        backgroundColor: isMean ? chartToken(cfg.fill ?? cfg.color) : color,
        fill: isMean ? 'origin' : false,
        order: isBar ? 999 : isMean ? 1 : 0,
        borderWidth: isBar ? 1.5 : 2.5,
        borderSkipped: isBar ? false : undefined,
        borderRadius: isBar ? { topLeft: 4, topRight: 4, bottomLeft: 0, bottomRight: 0 } : undefined,
        barThickness: isBar ? 14 : undefined,
        pointStyle: 'circle',
        pointRadius: isBar ? undefined : isMean ? 3.5 : 1,
        pointHoverRadius: isBar ? undefined : isMean ? 5 : 3,
        pointBackgroundColor: isMean ? chartToken('--color-white') : color,
        pointBorderColor: color,
        pointBorderWidth: isMean ? 2 : 1,
        tension: 0.3,
        spanGaps: true,
        data: records.map((r) => ({ x: new Date(r.date).getTime(), y: r[key] })),
      };
    });

    return { datasets };
  });

  readonly corrosionChartOptions = computed(() => {
    const yDomain = this.corrosionYDomain();
    const y1Domain = this.corrosionY1Domain();
    const page = this.corrosionPage();
    const viewStart = page?.start ?? 0;
    const viewEnd = page?.end ?? 0;

    return {
      responsive: true,
      animation: false as const,
      // Hover y tooltip resuelven siempre el mismo punto (índice más cercano en X) — igual que
      // physicochemistry.ts, evita que aparezcan dos cajas por el doble eje Y.
      interaction: { mode: 'index' as const, intersect: false, axis: 'x' as const },
      plugins: {
        legend: this.baseLegend(),
        tooltip: {
          position: 'nearest' as const,
          titleFont: { size: 14, weight: 'bold' },
          bodyFont: { size: 13 },
          displayColors: true,
          callbacks: {
            title: (items: Array<{ parsed: { x: number } }>) =>
              items[0] ? this.corrosionDate(items[0].parsed.x) : '',
          },
        },
      },
      scales: {
        x: {
          type: 'linear' as const,
          min: viewStart,
          max: viewEnd,
          bounds: 'data' as const,
          ticks: {
            callback: (value: number | string) => this.corrosionMonthYear(Number(value)),
            maxRotation: 0,
            autoSkip: true,
          },
        },
        y: {
          type: 'linear' as const,
          position: 'left' as const,
          min: yDomain.min,
          max: yDomain.max,
          title: { display: true, text: CORROSION_SERIES_CONFIG.generalCorrosionRate.label },
        },
        y1: {
          type: 'linear' as const,
          position: 'right' as const,
          min: y1Domain.min,
          max: y1Domain.max,
          title: { display: true, text: CORROSION_SERIES_CONFIG.maximumStingSpeed.label },
          grid: { drawOnChartArea: false },
        },
      },
    };
  });

  // Arrow para pasarla como `[resetHook]` a `<app-chart-frame>`.
  readonly resetCorrosionView = (): void => {
    this.corrosionPageIndex.set(Math.max(0, this.corrosionPages().length - 1));
  };

  // Reciben string ISO del backend o timestamp (callback de ticks); igual que en
  // physicochemistry.ts, pendiente el swap a dateParts/isoToLocalTimestamp (bug de zona horaria,
  // ver chart-dates.ts) hasta confirmar el formato de `date` que entrega el backend.
  private corrosionDate(d: string | number): string {
    const dt = new Date(d);
    const yy = String(dt.getFullYear()).slice(-2);
    return `${MESES[dt.getMonth()]} ${dt.getDate()} ${yy}`;
  }

  private corrosionMonthYear(d: string | number): string {
    const dt = new Date(d);
    const yy = String(dt.getFullYear()).slice(-2);
    return `${MESES[dt.getMonth()]} ${yy}`;
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

  // ----------------------------- Popup: detalle de inyección de un mes -----------------------------
  // Se abre con la lupa de cada fila del "ejecutado" mensual. `selectedMonth` guarda el mes
  // elegido (o null si el popup está cerrado); el resource de detalle solo pide datos cuando
  // hay un mes seleccionado (ver OverviewService.monthlyInjections).
  private readonly selectedMonth = signal<{ mes: string; label: string } | null>(null);

  readonly monthlyInjections = this.overviewService.monthlyInjections(() => {
    const tank = this.filtersState.filters().tank;
    const sel = this.selectedMonth();
    if (!tank || !sel) return undefined;

    const [anio, mes] = sel.mes.split('-').map(Number);
    return { tankId: tank, anio, mes };
  });

  // Postbache no toma mediciones (llega con todos los numéricos en null): se descarta del
  // popup, que muestra solo Prebache y Seguimiento (los que sí traen datos).
  readonly visibleInjections = computed(
    () => this.monthlyInjections.value()?.filter((inj) => inj.bache !== 'Postbache') ?? [],
  );

  readonly detailDialogVisible = computed(() => this.selectedMonth() !== null);
  readonly detailDialogTitle = computed(() => {
    const sel = this.selectedMonth();
    return sel ? `Detalle de inyección · ${sel.label}` : '';
  });

  openMonthDetail(ej: TankSummaryEjecutado): void {
    this.selectedMonth.set({ mes: ej.mes, label: `${this.mesLabel(ej.mes)} ${ej.mes.split('-')[0]}` });
  }

  closeMonthDetail(): void {
    this.selectedMonth.set(null);
  }

  // `visibleChange` del p-dialog: se dispara en `false` al cerrar con la X, ESC o clic
  // fuera del modal (dismissableMask).
  onDetailDialogVisibleChange(visible: boolean): void {
    if (!visible) this.closeMonthDetail();
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

  // Igual que numOrDash pero para texto libre (observaciones).
  textOrDash(value: string | null | undefined): string {
    return value == null || value.trim() === '' ? '—' : value;
  }

  // 'yyyy-MM-dd' -> '5 Ago 2025'. Usa formatFullDate (chart-dates.ts) para no arrastrar
  // el mismo bug de zona horaria que `mesLabel`.
  protected readonly formatFullDate = formatFullDate;

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
