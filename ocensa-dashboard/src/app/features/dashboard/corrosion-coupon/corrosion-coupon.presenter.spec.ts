import { describe, expect, it } from 'vitest';
import { analyticalTraceFixture } from '../../../../testing/analytical-trace-fixture';
import {
  CorrosionCouponFacet,
  CorrosionCouponPoint,
  CorrosionCouponResponse,
} from '../../../core/models/corrosion-coupon.model';
import {
  buildCorrosionCouponChartData,
  buildCorrosionCouponChartOptions,
} from './corrosion-coupon.presenter';

function dayNumber(value: string): number {
  return Math.floor(Date.parse(`${value}T00:00:00Z`) / 86_400_000) + 719_162;
}

function response(): CorrosionCouponResponse {
  const points: CorrosionCouponPoint[] = [
    {
      observationId: 'Sheet1-AD2',
      resultSetId: 'result-1',
      facetId: 'facet-1',
      seriesId: 'series-1',
      plotX: dayNumber('2021-03-10'),
      date: '2021-03-10',
      partialPeriod: false,
      tank: 'TQ55000',
      campaignRaw: 'I-2021 ',
      method: 'coupon',
      value: 2.37,
      plotValue: 2.37,
      valueDisplay: '2.37 mpy',
      rawValue: '2.37',
      valueStatus: 'valid',
      plotKind: 'exact',
      categoryId: 'moderada',
      reportedCategory: 'MODERADA',
      categoryStandardVersion: 'NACE SP0775-23',
      exposureStatus: 'missing',
      exposureStart: null,
      exposureEnd: null,
      unit: 'mpy',
      source: {
        sheet: 'Sheet1',
        valueCell: 'Sheet1!AD2',
        categoryCell: 'Sheet1!AE2',
        rawValue: '2.37',
        rawCategory: 'MODERADA',
      },
      traceToken: 'trace-1',
      traceEndpoint: analyticalTraceFixture({
        metricId: 'THPS.CORROSION.COUPON.MPY.V1',
        chartId: 'H10-COR-COUPON.V1',
        chartVersion: 'V1',
        resultSetId: 'result-1',
        pointId: 'Sheet1-AD2',
        traceToken: 'trace-1',
        filters: { method: 'coupon' },
      }),
      warnings: [],
    },
  ];
  const facet: CorrosionCouponFacet = {
    facetId: 'facet-1',
    resultSetId: 'result-1',
    tank: 'TQ55000',
    label: 'TQ55000 · cupón AD/AE',
    availabilityLabel: '1 observaciones · 2 filas CIC candidatas',
    population: {
      candidateCicRows: 2,
      eligibleN: 1,
      validN: 1,
      reportedZeroN: 0,
      invalidN: 1,
      missingN: 0,
      display: '1 observaciones / 2 filas CIC candidatas',
    },
    series: {
      id: 'series-1',
      label: 'TQ55000 · corrosión general por cupón',
      unit: 'mpy',
      color: '#1c4463',
      allowedModes: ['points'],
      defaultMode: 'points',
      method: 'coupon',
    },
    points,
  };

  return {
    chartId: 'H10-COR-COUPON.V1',
    chartVersion: 'V1',
    metricId: 'THPS.CORROSION.COUPON.MPY.V1',
    metricVersion: 'V1',
    datasetReleaseId: 'release-1',
    importBatchId: 'batch-1',
    calculationRunId: 'run-1',
    resultSetId: 'result-1',
    generatedAt: '2026-08-20T12:00:00Z',
    cutoffDate: '2026-05-23',
    periodStart: '2021-03-10',
    periodEnd: '2026-05-19',
    partialPeriod: true,
    approvalStatus: 'provisional_descriptive',
    approvalLabel: 'Provisional',
    unit: 'mpy',
    unitEvidence: 'METRIC_CONTRACT_NOT_SOURCE_HEADER',
    chemicalBasis: null,
    n: 1,
    eligibleN: 1,
    numerator: null,
    denominator: null,
    coverage: null,
    coverageDisplay: null,
    warnings: [
      'EXPOSURE_PERIOD_MISSING',
      'NO_MIC_INFERENCE',
      'NO_CROSS_METHOD_TANK_RANKING',
      'NACE_CATEGORY_REPORTED_NOT_RECALCULATED',
      '2026_PARTIAL',
    ],
    filtersApplied: { method: 'coupon' },
    exportPopulationToken: 'population-1',
    grain: 'CorrosionObservation',
    expectedGrain: 'CouponExposureEvent',
    grainWarning: 'EXPOSURE_PERIOD_MISSING',
    exposureStatus: 'missing',
    population: facet.population,
    xAxis: {
      field: 'plotX',
      title: 'Fecha de observación',
      unit: null,
      scale: 'linear',
      min: dayNumber('2021-03-10'),
      max: dayNumber('2021-03-11'),
      transformNote: 'API',
    },
    yAxis: {
      field: 'plotValue',
      title: 'Velocidad de corrosión general por cupón',
      unit: 'mpy',
      scale: 'linear',
      min: 0,
      max: 3,
      transformNote: 'API',
    },
    xTicks: [
      { value: dayNumber('2021-03-10'), label: '2021-03-10' },
      { value: dayNumber('2021-03-11'), label: '2021-03-11' },
    ],
    yTicks: [
      { value: 0, label: '0' },
      { value: 1.5, label: '1.5' },
      { value: 3, label: '3' },
    ],
    thresholds: [],
    categories: [
      {
        id: 'moderada',
        reportedLabel: 'MODERADA',
        displayLabel: 'MODERADA · categoría reportada',
        color: '#d97706',
        pointStyle: 'triangle',
        symbol: '▲',
        count: 1,
        displayCount: '1 observaciones',
      },
    ],
    facets: [facet],
    tableEquivalent: true,
  };
}

describe('corrosion coupon chart presenter', () => {
  it('plots only API coordinates and keeps the AE category as color and point shape', () => {
    const candidate = response();
    const data = buildCorrosionCouponChartData(candidate, candidate.facets[0]);
    const moderate = data.datasets.find(
      (dataset) => (dataset as { categoryId?: string }).categoryId === 'moderada',
    );

    expect(moderate).toMatchObject({
      label: 'MODERADA · categoría reportada',
      backgroundColor: '#d97706',
      pointStyle: 'triangle',
      showLine: false,
      tension: 0,
    });
    expect(moderate?.data).toEqual([
      expect.objectContaining({ x: dayNumber('2021-03-10'), y: 2.37 }),
    ]);
  });

  it('uses the API linear domains and exact ticks with zero visible', () => {
    const options = buildCorrosionCouponChartOptions(response());
    const x = options.scales?.['x'];
    const y = options.scales?.['y'];
    const xCallback =
      typeof x === 'object' && x.ticks && typeof x.ticks !== 'boolean' ? x.ticks.callback : null;
    const yCallback =
      typeof y === 'object' && y.ticks && typeof y.ticks !== 'boolean' ? y.ticks.callback : null;

    expect(x).toMatchObject({
      type: 'linear',
      min: dayNumber('2021-03-10'),
      max: dayNumber('2021-03-11'),
    });
    expect(y).toMatchObject({ type: 'linear', min: 0, max: 3, beginAtZero: true });
    expect(xCallback?.call({} as never, dayNumber('2021-03-11'), 1, [])).toBe('2021-03-11');
    expect(yCallback?.call({} as never, 0, 0, [])).toBe('0');
    expect(yCallback?.call({} as never, 2, 1, [])).toBe('');
  });

  it('contains no line, threshold, interpolation, summary or alternate method dataset', () => {
    const candidate = response();
    const data = buildCorrosionCouponChartData(candidate, candidate.facets[0]);

    expect(data.datasets.every((dataset) => dataset.showLine === false)).toBe(true);
    expect(
      data.datasets.every(
        (dataset) => (dataset as { role?: string }).role === 'coupon-observations',
      ),
    ).toBe(true);
    expect(
      data.datasets.some((dataset) =>
        /electro|bio|threshold|media|mediana/i.test(String(dataset.label)),
      ),
    ).toBe(false);
  });
});
