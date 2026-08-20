import { ChartData, ChartOptions, TooltipItem } from 'chart.js';
import {
  CoverageCell,
  CoverageColorToken,
  CoverageMetricResponse,
} from '../../../core/models/coverage.model';

interface CoverageChartDataset {
  label: string;
  stateId: string;
  data: Array<number | null>;
  backgroundColor: string;
  borderColor: string;
  borderWidth: number;
  coverageCells: Array<CoverageCell | null>;
}

const COVERAGE_COLORS: Record<CoverageColorToken, string> = {
  navy: '#1c4463',
  teal: '#176b87',
  orange: '#e8590c',
  green: '#287a2c',
  red: '#b42318',
  slate: '#6b7a99',
};

export function coverageColor(token: CoverageColorToken): string {
  return COVERAGE_COLORS[token];
}

/** Maps API values to Chart.js without deriving proportions or categories. */
export function buildCoverageChartData(
  result: CoverageMetricResponse,
): ChartData<'bar', Array<number | null>, string> {
  return {
    labels: result.rows.map((row) => row.label),
    datasets: result.states.map((state) => {
      const cells = result.rows.map(
        (row) => row.cells.find((cell) => cell.stateId === state.id) ?? null,
      );
      return {
        label: state.label,
        stateId: state.id,
        data: cells.map((cell) => cell?.proportion ?? null),
        backgroundColor: coverageColor(state.colorToken),
        borderColor: '#ffffff',
        borderWidth: 1,
        coverageCells: cells,
      } as CoverageChartDataset;
    }),
  };
}

function coverageCellForTooltip(context: TooltipItem<'bar'>): CoverageCell | null {
  const dataset = context.dataset as unknown as CoverageChartDataset;
  return dataset.coverageCells[context.dataIndex] ?? null;
}

export function buildCoverageChartOptions(
  result: CoverageMetricResponse,
): ChartOptions<'bar'> {
  const axisMin = result.valueAxis.min as number;
  const axisMax = result.valueAxis.max as number;
  const tickLabels = new Map(result.valueTicks.map((tick) => [tick.value, tick.label]));

  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    indexAxis: 'y',
    interaction: { mode: 'nearest', intersect: true },
    plugins: {
      legend: {
        position: 'bottom',
        labels: { color: '#0d1b2e', usePointStyle: true, boxWidth: 12 },
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const cell = coverageCellForTooltip(context);
            return cell
              ? `${context.dataset.label}: ${cell.displayValue}`
              : `${context.dataset.label}: no disponible`;
          },
          afterLabel: (context) => {
            const cell = coverageCellForTooltip(context);
            return cell ? `Punto trazable: ${cell.pointId}` : '';
          },
        },
      },
    },
    scales: {
      x: {
        stacked: true,
        min: axisMin,
        max: axisMax,
        title: {
          display: true,
          text: `${result.valueAxis.title} (${result.valueAxis.unit})`,
          color: '#1c4463',
          font: { weight: 700 },
        },
        ticks: {
          color: '#6b7a99',
          callback: (value) => tickLabels.get(Number(value)) ?? '',
        },
        grid: { color: '#e7eef4' },
      },
      y: {
        stacked: true,
        title: {
          display: true,
          text: result.dimensionLabel,
          color: '#1c4463',
          font: { weight: 700 },
        },
        ticks: { color: '#0d1b2e' },
        grid: { display: false },
      },
    },
  };
}
