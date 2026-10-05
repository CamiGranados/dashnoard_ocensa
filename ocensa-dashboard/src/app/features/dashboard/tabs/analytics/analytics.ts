import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ChartModule } from 'primeng/chart';
import { BiocideControlService } from '../../../../core/services/biocide-control.service';
import {
  BiocideControlWindow,
  BiocideControlVariable,
  BoxplotGroupStats,
  AnalyticsMetricCard,
  BoxPoint,
  VariableBoxChart,
} from '../../../../core/models/biocide-control.model';
import { BiocideEfficacyService } from '../../../../core/services/biocide-efficacy.service';
import { BacteriaEfficacyRow } from '../../../../core/models/biocide-efficacy.model';
import { KpiCard, KpiAccent } from '../../../../shared/components/kpi-card/kpi-card';
import { ChartLegend, ChartLegendItem } from '../../../../shared/charts/chart-legend/chart-legend';
import { ChartFrame } from '../../../../shared/charts/chart-frame/chart-frame';
import { ChartTool } from '../../../../shared/charts/chart-toolbar/chart-toolbar';
import { formatFullDate } from '../../../../shared/charts/chart-dates';
import { applyChartDefaults } from '../../../../shared/charts/chart-defaults';
import {
  chartToken,
  BIOCIDE_GROUP_TOKEN,
  BIOCIDE_GROUP_FILL_TOKEN,
} from '../../../../shared/charts/chart-tokens';
import { BoxplotCard, formatBoxNumber } from '../../../../shared/charts/boxplot-card/boxplot-card';
import { boxAnnotationsPlugin, BoxAnnotationsOptions } from '../../../../shared/charts/boxplot-card/boxplot-annotations.plugin';
import { boxplotStatsFromGroup } from '../../../../shared/charts/boxplot-stats';
import { EfficacyTable } from './efficacy-table/efficacy-table';
import { barValueLabelsPlugin } from './analytics.plugins';
import { boxVariableConfig } from './boxplot-variables.config';


const GROUP_LABELS = ['Controlado', 'No controlado'];

function toBoxPoint(stats: BoxplotGroupStats | null): BoxPoint | null {
  if (!stats) return null;
  return {
    min: stats.absoluteMin,
    max: stats.absoluteMax,
    q1: stats.q1,
    median: stats.median,
    q3: stats.q3,
    whiskerMin: stats.whiskerMin,
    whiskerMax: stats.whiskerMax,
    outliers: stats.outliers,
    count: stats.count,
  };
}

function fmt(n: number | null | undefined): string {
  return n == null || !Number.isFinite(n) ? '—' : n.toFixed(2);
}

function boxTooltipLines(raw: BoxPoint | null | undefined): string[] {
  if (!raw) return ['Sin datos'];
  return [
    `n = ${raw.count}`,
    `Mediana: ${fmt(raw.median)}`,
    `Q1 – Q3: ${fmt(raw.q1)} – ${fmt(raw.q3)}`,
    `Bigotes: ${fmt(raw.whiskerMin)} – ${fmt(raw.whiskerMax)}`,
    `Mín/Máx real: ${fmt(raw.min)} – ${fmt(raw.max)}`,
  ];
}

/** Fila de BacteriaEfficacyRow para una bacteria: fusiona el % de la ventana completa
 *  (byInjectionWindow) con el de la muestra individual (bySample). */
function bacteriaRow(
  key: BacteriaEfficacyRow['key'],
  label: string,
  windowControlPercent: number | null,
  samplesCount: number,
  sampleControlPercent: number | null,
  sampleOutOfControlPercent: number | null,
): BacteriaEfficacyRow {
  return { key, label, windowControlPercent, samplesCount, sampleControlPercent, sampleOutOfControlPercent };
}

@Component({
  selector: 'app-analytics',
  imports: [CommonModule, TableModule, ChartModule, KpiCard, ChartLegend, ChartFrame, EfficacyTable, BoxplotCard],
  templateUrl: './analytics.html',
  styleUrl: './analytics.css',
})
export class Analytics {
  private readonly biocideControlService = inject(BiocideControlService);
  private readonly biocideEfficacyService = inject(BiocideEfficacyService);

  readonly review = this.biocideControlService.review;
  readonly efficacy = this.biocideEfficacyService.review;

  readonly windows = computed<BiocideControlWindow[]>(() => this.review.value()?.data ?? []);
  readonly variables = computed<BiocideControlVariable[]>(() => this.review.value()?.variables ?? []);

  // Sólo cuentan las ventanas evaluadas (controlled !== null): ver comentario del DTO.
  private readonly controlledCount = computed(
    () => this.windows().filter((w) => w.controlled === true).length,
  );
  private readonly notControlledCount = computed(
    () => this.windows().filter((w) => w.controlled === false).length,
  );
  private readonly evaluatedCount = computed(() => this.controlledCount() + this.notControlledCount());
  private readonly controlledRate = computed(() => {
    const total = this.evaluatedCount();
    return total ? (this.controlledCount() / total) * 100 : null;
  });

  readonly metrics = computed<AnalyticsMetricCard[]>(() => {
    if (!this.windows().length) return [];
    return [
      {
        title: 'Ventanas de inyección',
        value: this.windows().length,
        unit: '',
        subtitle: `${this.evaluatedCount()} evaluadas para control`,
        icon: 'fa-solid fa-flask-vial',
        color: 'info',
      },
      {
        title: 'Controladas',
        value: this.controlledCount(),
        unit: '',
        subtitle: 'Bacteria planctónica bajo el límite',
        icon: 'fa-solid fa-circle-check',
        color: 'success',
      },
      {
        title: 'No controladas',
        value: this.notControlledCount(),
        unit: '',
        subtitle: 'Requieren atención',
        icon: 'fa-solid fa-triangle-exclamation',
        color: 'danger',
      },
      {
        title: '% de control',
        value: this.controlledRate(),
        unit: '%',
        subtitle: 'Sobre ventanas evaluadas',
        icon: 'fa-solid fa-gauge-high',
        color: 'warning',
      },
    ];
  });

  protected readonly legendItems: ChartLegendItem[] = [
    { label: 'Controlado', color: chartToken(BIOCIDE_GROUP_TOKEN.controlled, '#188a56'), shape: 'circle' },
    { label: 'No controlado', color: chartToken(BIOCIDE_GROUP_TOKEN.notControlled, '#c0392b'), shape: 'circle' },
  ];

  // Sólo descargar/expandir/tabla/copiar: con 2 categorías por variable el zoom/pan no aporta.
  protected readonly boxTools: readonly ChartTool[] = ['download', 'expand', 'more'];

  constructor() {
    applyChartDefaults();
  }

  readonly boxCharts = computed<VariableBoxChart[]>(() => {
    const bg = [
      chartToken(BIOCIDE_GROUP_FILL_TOKEN.controlled),
      chartToken(BIOCIDE_GROUP_FILL_TOKEN.notControlled),
    ];
    const border = [chartToken(BIOCIDE_GROUP_TOKEN.controlled), chartToken(BIOCIDE_GROUP_TOKEN.notControlled)];
    const windows = this.windows();
    const font = `10px ${chartToken('--chart-font-mono', 'monospace')}`;

    return this.variables().map((v) => {
      const cfg = boxVariableConfig(v.variable, v.label);
      const rows = cfg
        ? windows.filter((w) => typeof w[cfg.field] === 'number')
        : [];
      const rawOf = (controlled: boolean) =>
        rows.filter((w) => w.controlled === controlled).map((w) => w[cfg!.field] as number);

      const points = [toBoxPoint(v.controlled), toBoxPoint(v.notControlled)];
      const shownGroup: 0 | 1 = v.notControlled ? 1 : 0;
      const stats = boxplotStatsFromGroup(
        shownGroup === 1 ? v.notControlled : v.controlled,
        cfg ? rawOf(shownGroup === 0) : [],
      );
      const outlierCount = (v.controlled?.outliers.length ?? 0) + (v.notControlled?.outliers.length ?? 0);

      // Fecha de cada outlier del grupo mostrado (si se puede cruzar con las ventanas).
      const shownRows = rows.filter((w) => w.controlled === (shownGroup === 0));
      const outliers = (stats?.outliers ?? []).map((value) => {
        const win = cfg ? shownRows.find((w) => w[cfg.field] === value) : undefined;
        const date = win ? formatFullDate(win.injectionDate) : '';
        return { value, text: date ? `${formatBoxNumber(value)} · ${date}` : formatBoxNumber(value) };
      });

      const annotations: BoxAnnotationsOptions = {
        groupIndex: shownGroup,
        stats,
        format: formatBoxNumber,
        font,
        textColor: chartToken('--chart-bx-annot', '#6b7a99'),
        outlierColor: chartToken('--chart-bx-outlier', '#d92d20'),
        limitColor: chartToken('--chart-bx-limit', '#d92d20'),
        bandColor: chartToken('--chart-bx-band', 'rgba(24,138,86,0.1)'),
        outliers,
        band: cfg?.safeBand ?? null,
        limit: cfg?.limit ?? null,
      };
      const refValues = [cfg?.limit, cfg?.safeBand?.min, cfg?.safeBand?.max].filter((n): n is number => n != null);

      return {
        variable: v.variable,
        label: v.label,
        color: chartToken(cfg?.colorToken ?? '--color-primary', '#1c4463'),
        hasData: points.some((p) => p != null),
        shownGroup,
        stats,
        outlierCount,
        spreadMetric: cfg?.spreadMetric ?? 'sigma',
        limit: cfg?.limit ?? null,
        plugins: [boxAnnotationsPlugin],
        data: {
          labels: GROUP_LABELS,
          datasets: [
            {
              label: v.label,
              data: points,
              backgroundColor: bg,
              borderColor: border,
              borderWidth: 1.5,
              medianColor: chartToken('--chart-biocide-median', '#2563eb'),
              outlierBackgroundColor: chartToken('--chart-bx-outlier', '#d92d20'),
              outlierBorderColor: chartToken('--chart-bx-outlier', '#d92d20'),
              outlierRadius: 3,
              itemRadius: 0,
              barPercentage: 0.5,
              categoryPercentage: 0.9,
            },
          ],
        },
        options: {
          responsive: true,
          animation: false,
          layout: { padding: { top: 14, bottom: 14, left: 2, right: 2 } },
          plugins: {
            legend: { display: false },
            boxAnnotations: annotations,
            tooltip: {
              callbacks: {
                title: (items: { dataIndex: number }[]) => GROUP_LABELS[items[0]?.dataIndex ?? 0],
                label: (ctx: { raw: unknown }) => boxTooltipLines(ctx.raw as BoxPoint | null),
              },
            },
          },
          scales: {
            x: { display: false },
            y: {
              display: false,
              grid: { display: false },
              grace: '10%',
              ...(refValues.length
                ? { suggestedMin: Math.min(...refValues), suggestedMax: Math.max(...refValues) }
                : {}),
            },
          },
        },
      };
    });
  });

  // ----------------------------- Eficacia del biocida (biocide-efficacy) -----------------------------

  private readonly byInjectionWindow = computed(() => this.efficacy.value()?.byInjectionWindow ?? null);
  private readonly bySample = computed(() => this.efficacy.value()?.bySample ?? null);
  readonly thpsByControlStatus = computed(() => this.efficacy.value()?.thpsByControlStatus ?? []);

  readonly hasEfficacyData = computed(() => this.byInjectionWindow() != null);

  readonly efficacyMetrics = computed<AnalyticsMetricCard[]>(() => {
    const w = this.byInjectionWindow();
    if (!w) return [];
    return [
      {
        title: 'Ventanas evaluadas',
        value: w.injectionsCount,
        unit: '',
        subtitle: 'Prebache hasta el siguiente Prebache',
        icon: 'fa-solid fa-layer-group',
        color: 'info',
      },
      {
        title: '% control (ventana completa)',
        value: w.controlPercent,
        unit: '%',
        subtitle: 'Todo o nada: una muestra fuera de rango invalida la ventana',
        icon: 'fa-solid fa-shield-halved',
        color: 'success',
      },
      {
        title: 'Días promedio a rebrote',
        value: w.averageDaysToRebound,
        unit: 'días',
        subtitle: 'Tiempo hasta volver a superar el umbral',
        icon: 'fa-solid fa-clock-rotate-left',
        color: 'warning',
      },
    ];
  });

  // Fusiona byInjectionWindow (% por ventana completa) + bySample (% por muestra individual) para
  // las 4 bacterias planctónicas, + una fila de totales con los agregados de bySample.
  readonly bacteriaRows = computed<BacteriaEfficacyRow[]>(() => {
    const w = this.byInjectionWindow();
    const s = this.bySample();
    if (!w || !s) return [];
    return [
      bacteriaRow('bsr', 'BSR', w.bsrControlPercent, s.bsrSamplesCount, s.bsrControlPercent, s.bsrOutOfControlPercent),
      bacteriaRow('bpa', 'BPA', w.bpaControlPercent, s.bpaSamplesCount, s.bpaControlPercent, s.bpaOutOfControlPercent),
      bacteriaRow('bht', 'BHT', w.bhtControlPercent, s.bhtSamplesCount, s.bhtControlPercent, s.bhtOutOfControlPercent),
      bacteriaRow('bant', 'BAnT', w.bAntControlPercent, s.bAntSamplesCount, s.bAntControlPercent, s.bAntOutOfControlPercent),
      bacteriaRow(null, 'Total Combinado', w.controlPercent, s.evaluatedSamplesCount, s.controlPercent, s.outOfControlPercent),
    ];
  });

  /** Total de muestras evaluadas (badge de la cabecera de la tabla de bacterias). */
  readonly totalSamplesCount = computed(() => this.bySample()?.evaluatedSamplesCount ?? 0);

  // THPS promedio (Controlado vs No controlado): mismos tokens/colores que el boxplot de arriba.
  readonly thpsStatusChart = computed(() => {
    const rows = this.thpsByControlStatus();
    const controlled = rows.find((r) => r.controlled) ?? null;
    const notControlled = rows.find((r) => !r.controlled) ?? null;
    const counts = [controlled?.samplesCount ?? 0, notControlled?.samplesCount ?? 0];

    return {
      hasData: rows.length > 0,
      plugins: [barValueLabelsPlugin],
      data: {
        labels: GROUP_LABELS,
        datasets: [
          {
            label: 'THPS promedio (%)',
            data: [controlled?.averageThpsPercent ?? null, notControlled?.averageThpsPercent ?? null],
            backgroundColor: [
              chartToken(BIOCIDE_GROUP_FILL_TOKEN.controlled),
              chartToken(BIOCIDE_GROUP_FILL_TOKEN.notControlled),
            ],
            borderColor: [chartToken(BIOCIDE_GROUP_TOKEN.controlled), chartToken(BIOCIDE_GROUP_TOKEN.notControlled)],
            borderWidth: 1.5,
            borderRadius: 4,
            barThickness: 56,
          },
        ],
      },
      options: {
        responsive: true,
        animation: false,
        layout: { padding: { top: 20 } },
        plugins: {
          legend: { display: false },
          barValueLabels: { format: (v: number) => `${fmt(v)}%` },
          tooltip: {
            callbacks: {
              label: (ctx: { parsed: { y: number }; dataIndex: number }) =>
                `THPS promedio: ${fmt(ctx.parsed.y)}%  (n = ${counts[ctx.dataIndex] ?? 0})`,
            },
          },
        },
        scales: {
          x: {
            ticks: {
              maxRotation: 0,
              callback: (_value: unknown, index: number) => [GROUP_LABELS[index] ?? '', `N = ${counts[index] ?? 0}`],
            },
          },
          y: { title: { display: true, text: 'THPS (%)' }, grace: '5%' },
        },
      },
    };
  });

  // Diagnóstico de principio activo, derivado de THPS por estado y % de control de ventana.
  // Los umbrales de los textos (90 % consumo, 50/80 % de control) son criterio de presentación
  // del frontend, no vienen del backend.
  readonly activeDiagnosis = computed(() => {
    const rows = this.thpsByControlStatus();
    const controlled = rows.find((r) => r.controlled) ?? null;
    const notControlled = rows.find((r) => !r.controlled) ?? null;
    if (!controlled && !notControlled) return null;

    const consumed = controlled ? 100 - controlled.averageThpsPercent : null;
    const delta = this.thpsDelta();
    const falseResidual = delta != null && delta > 0;

    const windowControl = this.byInjectionWindow()?.controlPercent ?? null;
    const correlation =
      windowControl == null
        ? null
        : {
            percent: windowControl,
            label: windowControl < 50 ? 'Crítico' : windowControl < 80 ? 'Moderado' : 'Óptimo',
            tone: windowControl < 50 ? 'danger' : windowControl < 80 ? 'warn' : 'ok',
          };

    return {
      efficiency: {
        title: consumed != null && consumed >= 90 ? 'Consumo Óptimo' : 'Consumo Parcial',
        tone: consumed != null && consumed >= 90 ? 'ok' : 'warn',
        detail:
          consumed != null
            ? `${consumed.toFixed(1)}% de molécula activa consumida en erradicación.`
            : 'Sin muestras controladas para estimar el consumo.',
      },
      emulsion: {
        title: falseResidual ? 'Falso Residual' : 'Sin Falso Residual',
        tone: falseResidual ? 'warn' : 'ok',
        detail: falseResidual
          ? 'THPS acumulado sin contacto efectivo con biofilm activo.'
          : 'El THPS residual no supera al de las muestras controladas.',
      },
      correlation,
    };
  });

  // Diferencia entre el THPS promedio de "No controlado" y "Controlado", en puntos porcentuales.
  // Sólo la magnitud: el backend no expone desviación estándar por muestra, así que no se puede
  // derivar significancia estadística (p-value) sin inventarla.
  readonly thpsDelta = computed(() => {
    const rows = this.thpsByControlStatus();
    const controlled = rows.find((r) => r.controlled) ?? null;
    const notControlled = rows.find((r) => !r.controlled) ?? null;
    if (!controlled || !notControlled) return null;
    return notControlled.averageThpsPercent - controlled.averageThpsPercent;
  });
}
