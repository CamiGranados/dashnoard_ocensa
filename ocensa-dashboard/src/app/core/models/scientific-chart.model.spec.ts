import { describe, expect, it } from 'vitest';
import {
  ScientificChartResponse,
  ScientificSeriesSpec,
  coerceScientificChartMode,
  validateScientificChartContract,
} from './scientific-chart.model';

const doseSeries: ScientificSeriesSpec = {
  id: 'actual-dose',
  label: 'Dosis real',
  unit: 'ppm',
  color: '#1c4463',
  allowedModes: ['stems', 'points', 'bars'],
  defaultMode: 'stems',
};

function chart(): ScientificChartResponse {
  return {
    chartId: 'N01',
    chartVersion: '1.0.0',
    metricId: 'THPS.MICRO.GROUP.CONTROL.V1',
    metricVersion: '1.0.0',
    datasetReleaseId: 'release-1',
    importBatchId: 'batch-1',
    calculationRunId: 'run-1',
    resultSetId: 'result-1',
    generatedAt: '2026-08-20T12:00:00Z',
    cutoffDate: '2026-05-23',
    periodStart: '2021-01-01',
    periodEnd: '2026-05-23',
    partialPeriod: true,
    approvalStatus: 'provisional',
    approvalLabel: 'PROVISIONAL — no usar como decisión operativa',
    unit: 'Bac/mL',
    chemicalBasis: null,
    n: 8,
    eligibleN: 10,
    numerator: null,
    denominator: null,
    coverage: 0.8,
    coverageDisplay: '80 %',
    warnings: ['EVENT_GRAIN_PENDING'],
    filtersApplied: { tank: 'TK7311' },
    xAxis: {
      field: 'sampleDate',
      title: 'Fecha de muestra',
      unit: null,
      scale: 'time',
      min: '2021-01-01',
      max: '2026-05-23',
      transformNote: null,
    },
    yAxis: {
      field: 'count',
      title: 'Recuento planctónico',
      unit: 'Bac/mL',
      scale: 'logarithmic',
      min: 1,
      max: 1_000_000,
      transformNote: 'Solo positivos exactos; ceros y censura se muestran por estado.',
    },
    thresholds: [
      {
        id: 'micro-planctonic-reference',
        value: 100,
        label: 'Referencia 100 Bac/mL',
        unit: 'Bac/mL',
        comparison: '>',
        approvalStatus: 'provisional',
      },
    ],
    series: [doseSeries],
    points: [
      {
        pointId: 'point-1',
        seriesId: 'actual-dose',
        x: '2026-01-01',
        plotValue: 1_800,
        rawValue: '1800',
        numericValue: 1_800,
        lowerBound: null,
        upperBound: null,
        qualifier: null,
        status: 'valid',
        plotKind: 'exact',
        sampleRole: null,
        tank: 'TK7311',
        drain: 'DO',
        sourceCellIds: ['Sheet1!DD10'],
        warnings: [],
      },
    ],
    exportPopulationToken: 'population-1',
  };
}

describe('scientific chart wire contract', () => {
  it('permits only chart modes declared by the server spec', () => {
    expect(coerceScientificChartMode(doseSeries, 'points')).toBe('points');
    expect(coerceScientificChartMode(doseSeries, 'bars')).toBe('bars');
    expect(coerceScientificChartMode(doseSeries, 'line')).toBe('stems');
  });

  it('accepts an auditable chart population', () => {
    expect(validateScientificChartContract(chart())).toEqual([]);
  });

  it('fails closed when a plotted point loses its lineage', () => {
    const response = chart();
    response.points[0].sourceCellIds = [];

    expect(validateScientificChartContract(response)).toContainEqual({
      code: 'CHART_POINT_LINEAGE_MISSING',
      message: 'El punto point-1 no tiene celdas fuente.',
    });
  });

  it('does not permit censored or reported-zero points to gain an invented plot value', () => {
    const response = chart();
    response.points[0] = {
      ...response.points[0],
      status: 'reported_zero',
      plotKind: 'reported_zero',
      numericValue: 0,
      rawValue: '0',
      plotValue: 1,
    };

    expect(validateScientificChartContract(response).map((issue) => issue.code)).toContain(
      'CHART_NON_EXACT_POINT_PLOTTED',
    );
  });

  it('rejects inconsistent n/eligibleN and coverage', () => {
    const response = chart();
    response.n = 11;
    response.eligibleN = 10;
    response.coverage = 1.1;

    expect(validateScientificChartContract(response).map((issue) => issue.code)).toEqual(
      expect.arrayContaining(['RESULT_POPULATION_INVALID', 'RESULT_COVERAGE_INVALID']),
    );
  });

  it('requires server-formatted coverage instead of formatting a ratio in Angular', () => {
    const response = chart();
    response.coverageDisplay = null;

    expect(validateScientificChartContract(response).map((issue) => issue.code)).toContain(
      'RESULT_COVERAGE_DISPLAY_MISSING',
    );
  });
});
