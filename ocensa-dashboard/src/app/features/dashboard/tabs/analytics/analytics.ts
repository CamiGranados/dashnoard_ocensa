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
import { applyChartDefaults } from '../../../../shared/charts/chart-defaults';
import {
  chartToken,
  BIOCIDE_GROUP_TOKEN,
  BIOCIDE_GROUP_FILL_TOKEN,
  PLANCTONICA_TOKEN,
  PlanctonicaKey,
} from '../../../../shared/charts/chart-tokens';
import { barValueLabelsPlugin } from './analytics.plugins';


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
  imports: [CommonModule, TableModule, ChartModule, KpiCard, ChartLegend, ChartFrame],
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

    return this.variables().map((v) => {
      const points = [toBoxPoint(v.controlled), toBoxPoint(v.notControlled)];
      return {
        variable: v.variable,
        label: v.label,
        hasData: points.some((p) => p != null),
        data: {
          labels: GROUP_LABELS,
          datasets: [
            {
              label: v.label,
              data: points,
              backgroundColor: bg,
              borderColor: border,
              borderWidth: 1.5,
              outlierBackgroundColor: border,
              outlierBorderColor: border,
              itemRadius: 0,
            },
          ],
        },
        options: {
          responsive: true,
          animation: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx: { raw: unknown }) => boxTooltipLines(ctx.raw as BoxPoint | null),
              },
            },
          },
          scales: {
            x: { ticks: { maxRotation: 0, autoSkip: false } },
            y: { grace: '5%' },
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

  /** Resuelve el swatch de color de una fila (PLANCTONICA_TOKEN; la fila "Total" no tiene uno propio). */
  protected bacteriaColor(row: BacteriaEfficacyRow): string | null {
    return row.key == null ? null : chartToken(PLANCTONICA_TOKEN[row.key]);
  }

  private static readonly BACTERIA_DESCRIPTIONS: Record<PlanctonicaKey, string> = {
    bsr: 'Sulfatorreductoras',
    bpa: 'Productoras Ácido',
    bht: 'Heterótrofas Totales',
    bant: 'Anaerobias Totales',
  };

  /** Nombre completo de la bacteria (fila "Total" no tiene uno propio). */
  protected bacteriaDescription(row: BacteriaEfficacyRow): string | null {
    return row.key == null ? null : Analytics.BACTERIA_DESCRIPTIONS[row.key];
  }

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
