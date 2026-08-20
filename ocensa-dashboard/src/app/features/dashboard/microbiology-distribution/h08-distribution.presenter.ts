import { ChartData, ChartDataset, ChartOptions, ScatterDataPoint, TooltipItem } from 'chart.js';
import {
  H08DistributionFacet,
  H08DistributionPoint,
  H08DistributionResponse,
} from '../../../core/models/h08-distribution.model';
import { ScientificChartMode } from '../../../core/models/scientific-chart.model';

interface H08PlotDatum extends ScatterDataPoint {
  scientificPoint?: H08DistributionPoint;
}

type H08DatasetRole = 'exact-points' | 'threshold' | 'box';
type H08Dataset = ChartDataset<'scatter', H08PlotDatum[]> & {
  role: H08DatasetRole;
};

const NAVY = '#1c4463';
const ORANGE = '#e8590c';
const GRID = '#dce6ee';

function exactPointDataset(facet: H08DistributionFacet): H08Dataset {
  return {
    role: 'exact-points',
    label: facet.series.label,
    data: facet.points
      .filter(
        (point) =>
          point.status === 'valid' && point.plotKind === 'exact' && point.plotValue !== null,
      )
      .map((point) => ({
        x: point.plotX,
        y: point.plotValue!,
        scientificPoint: point,
      })),
    backgroundColor: facet.series.color,
    borderColor: '#ffffff',
    borderWidth: 1,
    pointRadius: 4,
    pointHoverRadius: 6,
    showLine: false,
  };
}

function thresholdDataset(response: H08DistributionResponse): H08Dataset {
  const threshold = response.thresholds.find(
    (candidate) =>
      candidate.value === 100 && candidate.unit === 'Bac/mL' && candidate.comparison === '>',
  )!;
  return {
    role: 'threshold',
    label: threshold.label,
    data: [
      { x: response.xAxis.min as number, y: threshold.value },
      { x: response.xAxis.max as number, y: threshold.value },
    ],
    borderColor: ORANGE,
    backgroundColor: ORANGE,
    borderWidth: 2,
    borderDash: [7, 5],
    pointRadius: 0,
    pointHoverRadius: 0,
    showLine: true,
    tension: 0,
  };
}

function boxDatasets(facet: H08DistributionFacet): H08Dataset[] {
  const summary = facet.boxSummary;
  if (!summary) return [];

  const line = (label: string, data: H08PlotDatum[], width = 2): H08Dataset => ({
    role: 'box',
    label,
    data,
    borderColor: NAVY,
    backgroundColor: 'rgba(28, 68, 99, 0.12)',
    borderWidth: width,
    pointRadius: 0,
    pointHoverRadius: 0,
    showLine: true,
    tension: 0,
  });

  return [
    line('Rango exacto positivo', [
      { x: 0.5, y: summary.min },
      { x: 0.5, y: summary.max },
    ]),
    line('Q1', [
      { x: 0.3, y: summary.q1 },
      { x: 0.7, y: summary.q1 },
    ]),
    line('Q3', [
      { x: 0.3, y: summary.q3 },
      { x: 0.7, y: summary.q3 },
    ]),
    line('Lado izquierdo', [
      { x: 0.3, y: summary.q1 },
      { x: 0.3, y: summary.q3 },
    ]),
    line('Lado derecho', [
      { x: 0.7, y: summary.q1 },
      { x: 0.7, y: summary.q3 },
    ]),
    line(
      `Mediana · ${summary.medianDisplay}`,
      [
        { x: 0.3, y: summary.median },
        { x: 0.7, y: summary.median },
      ],
      3,
    ),
  ];
}

/** Passes API values to Chart.js; it does not calculate log10, jitter or summaries. */
export function buildH08ChartData(
  response: H08DistributionResponse,
  facet: H08DistributionFacet,
  mode: ScientificChartMode,
): ChartData<'scatter', H08PlotDatum[]> {
  return {
    datasets: [
      exactPointDataset(facet),
      ...(mode === 'box' ? boxDatasets(facet) : []),
      thresholdDataset(response),
    ],
  };
}

function datasetForTooltip(context: TooltipItem<'scatter'>): H08Dataset {
  return context.dataset as H08Dataset;
}

function datumForTooltip(context: TooltipItem<'scatter'>): H08PlotDatum {
  return context.raw as H08PlotDatum;
}

export function buildH08ChartOptions(response: H08DistributionResponse): ChartOptions<'scatter'> {
  const tickLabels = new Map(response.yTicks.map((tick) => [tick.value, tick.label]));

  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    parsing: false,
    interaction: { mode: 'nearest', intersect: true },
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#0d1b2e',
          usePointStyle: true,
          boxWidth: 12,
          filter: (legendItem, data) => {
            const dataset = data.datasets[legendItem.datasetIndex ?? -1] as H08Dataset | undefined;
            return dataset?.role !== 'box' || String(dataset.label ?? '').startsWith('Mediana');
          },
        },
      },
      tooltip: {
        filter: (context) => datasetForTooltip(context).role === 'exact-points',
        callbacks: {
          title: (items) => {
            const point = items[0] ? datumForTooltip(items[0]).scientificPoint : null;
            return point?.sampleDate ?? 'Fecha no reportada';
          },
          label: (context) => {
            const point = datumForTooltip(context).scientificPoint;
            return point ? `${point.rawValue ?? '—'} ${point.unit}` : '';
          },
          afterLabel: (context) => {
            const point = datumForTooltip(context).scientificPoint;
            if (!point) return '';
            return [
              `${point.tank}${point.drain ? ` · ${point.drain}` : ''}`,
              `${point.statusLabel} · ${point.sourceCellIds.join(', ')}`,
              `Punto ${point.pointId}`,
            ];
          },
        },
      },
    },
    scales: {
      x: {
        type: 'linear',
        min: response.xAxis.min as number,
        max: response.xAxis.max as number,
        display: false,
        grid: { display: false },
      },
      y: {
        type: 'logarithmic',
        min: response.yAxis.min as number,
        max: response.yAxis.max as number,
        afterBuildTicks: (axis) => {
          axis.ticks = response.yTicks.map((tick) => ({ value: tick.value }));
        },
        title: {
          display: true,
          text: `${response.yAxis.title} (${response.yAxis.unit})`,
          color: NAVY,
          font: { weight: 700 },
        },
        ticks: {
          color: '#516276',
          callback: (value) => tickLabels.get(Number(value)) ?? '',
        },
        grid: { color: GRID },
      },
    },
  };
}
