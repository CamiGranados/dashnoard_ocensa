import { describe, expect, it } from 'vitest';
import {
  H08_BOX_TRACE_POINT_SUFFIX,
  H08DistributionResponse,
} from '../../../core/models/h08-distribution.model';
import { analyticalTraceFixture } from '../../../../testing/analytical-trace-fixture';
import { buildH08ChartData, buildH08ChartOptions } from './h08-distribution.presenter';

function h08Trace(pointId: string, traceToken: string): string {
  return analyticalTraceFixture({
    metricId: 'THPS.MICRO.GROUP.CONTROL.V1',
    chartId: 'H08',
    chartVersion: 'H08.V1',
    resultSetId: 'result-h08',
    pointId,
    traceToken,
  });
}

function response(): H08DistributionResponse {
  return {
    chartId: 'H08',
    chartVersion: 'H08.V1',
    metricId: 'THPS.MICRO.GROUP.CONTROL.V1',
    metricVersion: 'V1',
    datasetReleaseId: 'release-1',
    importBatchId: 'batch-1',
    calculationRunId: 'run-1',
    resultSetId: 'result-h08',
    generatedAt: '2026-08-20T12:00:00Z',
    cutoffDate: '2026-05-23',
    periodStart: null,
    periodEnd: null,
    partialPeriod: false,
    approvalStatus: 'provisional_descriptive',
    approvalLabel: 'Perfil descriptivo provisional',
    unit: 'Bac/mL',
    chemicalBasis: null,
    n: 2,
    eligibleN: 3,
    numerator: 2,
    denominator: 3,
    coverage: 2 / 3,
    coverageDisplay: '66.67 % (2/3)',
    warnings: [],
    filtersApplied: {},
    exportPopulationToken: 'population-h08',
    xAxis: {
      field: 'plotX',
      title: 'Dispersión',
      unit: null,
      scale: 'linear',
      min: 0,
      max: 1,
      transformNote: 'API',
    },
    yAxis: {
      field: 'plotValue',
      title: 'Recuento microbiológico',
      unit: 'Bac/mL',
      scale: 'logarithmic',
      min: 10,
      max: 1_000,
      transformNote: 'API',
    },
    yTicks: [
      { value: 10, label: '10' },
      { value: 100, label: '100' },
      { value: 1_000, label: '1000' },
    ],
    thresholds: [
      {
        id: 'micro-strictly-greater-than-100',
        value: 100,
        label: 'Umbral descriptivo > 100 Bac/mL',
        unit: 'Bac/mL',
        comparison: '>',
        approvalStatus: 'provisional_descriptive',
      },
    ],
    facets: [
      {
        facetId: 'facet-bsr',
        resultSetId: 'result-h08',
        traceSetId: 'trace-set-bsr',
        traceEndpoint: h08Trace('facet-bsr', 'trace-set-bsr'),
        group: 'BSR',
        label: 'TK7311 · BSR · positivos exactos y estados',
        tankLabel: 'TK7311',
        series: {
          id: 'series-bsr',
          label: 'BSR · positivos exactos',
          unit: 'Bac/mL',
          color: '#1c4463',
          allowedModes: ['points', 'box'],
          defaultMode: 'points',
          method: 'positive_exact_raw_values',
          microbialGroup: 'BSR',
        },
        distributionN: 2,
        eligibleN: 3,
        coverage: 2 / 3,
        coverageDisplay: '66.67 % (2/3)',
        statusLanes: [
          {
            status: 'reported_zero',
            label: 'Cero reportado',
            symbol: '○',
            count: 1,
            displayCount: '1',
            color: '#0f766e',
          },
          {
            status: 'not_detected',
            label: 'No detectado',
            symbol: '◇',
            count: 0,
            displayCount: '0',
            color: '#315b7d',
          },
          {
            status: 'censored_low',
            label: 'Censura inferior',
            symbol: '▽',
            count: 0,
            displayCount: '0',
            color: '#d97706',
          },
          {
            status: 'censored_high',
            label: 'Censura superior',
            symbol: '△',
            count: 0,
            displayCount: '0',
            color: '#d97706',
          },
          {
            status: 'missing',
            label: 'Faltante',
            symbol: '□',
            count: 0,
            displayCount: '0',
            color: '#64748b',
          },
          {
            status: 'invalid',
            label: 'Inválido',
            symbol: '×',
            count: 0,
            displayCount: '0',
            color: '#b42318',
          },
        ],
        boxSummary: {
          resultSetId: 'result-h08',
          facetId: 'facet-bsr',
          distributionN: 2,
          min: 100,
          q1: 325,
          median: 550,
          q3: 775,
          max: 1_000,
          minDisplay: '100',
          q1Display: '325',
          medianDisplay: '550',
          q3Display: '775',
          maxDisplay: '1000',
          traceToken: 'trace-box',
          traceEndpoint: h08Trace(`facet-bsr${H08_BOX_TRACE_POINT_SUFFIX}`, 'trace-box'),
        },
        points: [
          {
            pointId: 'positive',
            resultSetId: 'result-h08',
            facetId: 'facet-bsr',
            seriesId: 'series-bsr',
            plotX: 0.45,
            sampleDate: '2026-05-20',
            tank: 'TK7311',
            drain: null,
            source: 'CIC',
            rawValue: '1000',
            numericValue: 1_000,
            plotValue: 1_000,
            lowerBound: null,
            upperBound: null,
            qualifier: null,
            unit: 'Bac/mL',
            status: 'valid',
            statusLabel: 'Positivo exacto',
            plotKind: 'exact',
            sourceCellIds: ['Sheet1!A6', 'Sheet1!D6', 'Sheet1!Q6', 'Sheet1!AS6'],
            traceToken: 'trace-positive',
            traceEndpoint: h08Trace('positive', 'trace-positive'),
            warnings: [],
          },
          {
            pointId: 'zero',
            resultSetId: 'result-h08',
            facetId: 'facet-bsr',
            seriesId: 'series-bsr',
            plotX: 0.55,
            sampleDate: '2026-05-21',
            tank: 'TK7311',
            drain: null,
            source: 'CIC',
            rawValue: '0',
            numericValue: 0,
            plotValue: null,
            lowerBound: null,
            upperBound: null,
            qualifier: null,
            unit: 'Bac/mL',
            status: 'reported_zero',
            statusLabel: 'Cero reportado',
            plotKind: 'reported_zero',
            sourceCellIds: ['Sheet1!A7', 'Sheet1!D7', 'Sheet1!Q7', 'Sheet1!AS7'],
            traceToken: 'trace-zero',
            traceEndpoint: h08Trace('zero', 'trace-zero'),
            warnings: ['zero_excluded_from_log_axis'],
          },
          {
            pointId: 'threshold-exact',
            resultSetId: 'result-h08',
            facetId: 'facet-bsr',
            seriesId: 'series-bsr',
            plotX: 0.6,
            sampleDate: '2026-05-22',
            tank: 'TK7311',
            drain: null,
            source: 'CIC',
            rawValue: '100',
            numericValue: 100,
            plotValue: 100,
            lowerBound: null,
            upperBound: null,
            qualifier: null,
            unit: 'Bac/mL',
            status: 'valid',
            statusLabel: 'Positivo exacto',
            plotKind: 'exact',
            sourceCellIds: ['Sheet1!A8', 'Sheet1!D8', 'Sheet1!Q8', 'Sheet1!AS8'],
            traceToken: 'trace-threshold',
            traceEndpoint: h08Trace('threshold-exact', 'trace-threshold'),
            warnings: [],
          },
        ],
      },
    ],
  };
}

describe('H08 chart presenter', () => {
  it('plots only API-declared exact positives and never gives zero a log-axis floor', () => {
    const candidate = response();
    const data = buildH08ChartData(candidate, candidate.facets[0], 'points');
    const exactDataset = data.datasets.find(
      (dataset) => (dataset as { role?: string }).role === 'exact-points',
    );

    expect(exactDataset?.data).toHaveLength(2);
    expect(exactDataset?.data[0]).toMatchObject({ x: 0.45, y: 1_000 });
    expect(exactDataset?.data).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ y: 1 })]),
    );
  });

  it('keeps the 100 Bac/mL threshold visible as a dedicated server-declared series', () => {
    const candidate = response();
    const data = buildH08ChartData(candidate, candidate.facets[0], 'points');
    const threshold = data.datasets.find(
      (dataset) => (dataset as { role?: string }).role === 'threshold',
    );

    expect(threshold?.label).toBe('Umbral descriptivo > 100 Bac/mL');
    expect(threshold?.data).toEqual([
      { x: 0, y: 100 },
      { x: 1, y: 100 },
    ]);
    const exact = data.datasets.find(
      (dataset) => (dataset as { role?: string }).role === 'exact-points',
    );
    expect(exact?.data).toContainEqual(expect.objectContaining({ y: 100 }));
  });

  it('uses box values supplied by the API only when box mode is selected', () => {
    const candidate = response();
    const points = buildH08ChartData(candidate, candidate.facets[0], 'points');
    const box = buildH08ChartData(candidate, candidate.facets[0], 'box');

    expect(points.datasets.some((dataset) => (dataset as { role?: string }).role === 'box')).toBe(
      false,
    );
    expect(box.datasets.some((dataset) => (dataset as { role?: string }).role === 'box')).toBe(
      true,
    );
    expect(
      box.datasets.find((dataset) => (dataset as { role?: string }).role === 'exact-points')?.data,
    ).toHaveLength(2);
    expect(box.datasets.flatMap((dataset) => dataset.data).some((datum) => datum.y === 1_000)).toBe(
      true,
    );
  });

  it('uses the logarithmic domain and server-formatted tick labels without calculating log10', () => {
    const options = buildH08ChartOptions(response());
    const y = options.scales?.['y'];
    const tickCallback =
      typeof y === 'object' && y?.ticks && typeof y.ticks !== 'boolean' ? y.ticks.callback : null;

    expect(y).toMatchObject({ type: 'logarithmic', min: 10, max: 1_000 });
    expect(tickCallback?.call({} as never, 100, 0, [])).toBe('100');
    expect(tickCallback?.call({} as never, 50, 0, [])).toBe('');
  });
});
