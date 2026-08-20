import { ChartData, ChartDataset, ChartOptions, ScatterDataPoint, TooltipItem } from 'chart.js';
import {
  CorrosionCouponFacet,
  CorrosionCouponPoint,
  CorrosionCouponResponse,
} from '../../../core/models/corrosion-coupon.model';

interface CorrosionCouponPlotDatum extends ScatterDataPoint {
  scientificPoint: CorrosionCouponPoint;
}

type CorrosionCouponDataset = ChartDataset<'scatter', CorrosionCouponPlotDatum[]> & {
  role: 'coupon-observations';
  categoryId: string;
};

const GRID = '#dce6ee';
const NAVY = '#1c4463';

/**
 * Maps the API-declared AD/AE population to Chart.js. It does not group,
 * average, interpolate, smooth, recategorize or calculate chart coordinates.
 */
export function buildCorrosionCouponChartData(
  response: CorrosionCouponResponse,
  facet: CorrosionCouponFacet,
): ChartData<'scatter', CorrosionCouponPlotDatum[]> {
  return {
    datasets: response.categories.map((category): CorrosionCouponDataset => ({
      role: 'coupon-observations',
      categoryId: category.id,
      label: category.displayLabel,
      data: facet.points
        .filter((point) => point.categoryId === category.id)
        .map((point) => ({
          x: point.plotX,
          y: point.plotValue,
          scientificPoint: point,
        })),
      backgroundColor: category.color,
      borderColor: '#ffffff',
      borderWidth: 1.5,
      pointStyle: category.pointStyle,
      pointRadius: 5,
      pointHoverRadius: 7,
      showLine: false,
      tension: 0,
    })),
  };
}

function pointForTooltip(context: TooltipItem<'scatter'>): CorrosionCouponPoint {
  return (context.raw as CorrosionCouponPlotDatum).scientificPoint;
}

/** Uses only API domains, ticks, values and labels; zero remains visible. */
export function buildCorrosionCouponChartOptions(
  response: CorrosionCouponResponse,
): ChartOptions<'scatter'> {
  const xLabels = new Map(response.xTicks.map((tick) => [tick.value, tick.label]));
  const yLabels = new Map(response.yTicks.map((tick) => [tick.value, tick.label]));

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
        },
      },
      tooltip: {
        callbacks: {
          title: (items) => (items[0] ? pointForTooltip(items[0]).date : ''),
          label: (context) => {
            const point = pointForTooltip(context);
            return `${point.valueDisplay} · ${point.reportedCategory} reportada`;
          },
          afterLabel: (context) => {
            const point = pointForTooltip(context);
            return [
              `${point.tank} · ${point.campaignRaw}`,
              `${point.source.valueCell} + ${point.source.categoryCell}`,
              ...(point.partialPeriod ? ['2026 parcial hasta el corte declarado'] : []),
              `Observación ${point.observationId}`,
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
        afterBuildTicks: (axis) => {
          axis.ticks = response.xTicks.map((tick) => ({ value: tick.value }));
        },
        title: {
          display: true,
          text: response.xAxis.title,
          color: NAVY,
          font: { weight: 700 },
        },
        ticks: {
          color: '#516276',
          callback: (value) => xLabels.get(Number(value)) ?? '',
          maxRotation: 0,
        },
        grid: { color: GRID },
      },
      y: {
        type: 'linear',
        min: response.yAxis.min as number,
        max: response.yAxis.max as number,
        beginAtZero: true,
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
          callback: (value) => yLabels.get(Number(value)) ?? '',
        },
        grid: { color: GRID },
      },
    },
  };
}
