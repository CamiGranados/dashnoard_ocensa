import { describe, expect, it } from 'vitest';
import { analyticalTraceFixture } from '../../../../testing/analytical-trace-fixture';
import {
  COVERAGE_DENOMINATOR_DEFINITION_V1,
  COVERAGE_DIMENSION_LABEL_V1,
  COVERAGE_NUMERATOR_DEFINITION_V1,
  COVERAGE_RAW_STATE_SPECS_V1,
  COVERAGE_STATE_DIMENSION_LABEL_V1,
  COVERAGE_VALUE_AXIS_V1,
  COVERAGE_VALUE_TICKS_V1,
  CoverageMetricResponse,
} from '../../../core/models/coverage.model';
import { buildCoverageChartData, buildCoverageChartOptions } from './coverage-chart.presenter';

function response(): CoverageMetricResponse {
  return {
    metricId: 'THPS.DATA.COVERAGE.V1',
    metricVersion: 'V1',
    datasetReleaseId: 'release-1',
    importBatchId: 'batch-1',
    calculationRunId: 'run-1',
    resultSetId: 'result-1',
    generatedAt: '2026-08-20T12:00:00Z',
    cutoffDate: '2026-05-23',
    periodStart: null,
    periodEnd: null,
    partialPeriod: false,
    approvalStatus: 'approved_current',
    approvalLabel: 'Aprobado',
    unit: '%',
    chemicalBasis: null,
    n: 4,
    eligibleN: 4,
    numerator: 4,
    numeratorDefinition: COVERAGE_NUMERATOR_DEFINITION_V1,
    denominator: 4,
    denominatorDefinition: COVERAGE_DENOMINATOR_DEFINITION_V1,
    coverage: 1,
    coverageDisplay: '100 %',
    warnings: [],
    filtersApplied: {},
    exportPopulationToken: 'population-1',
    dimensionLabel: COVERAGE_DIMENSION_LABEL_V1,
    stateDimensionLabel: COVERAGE_STATE_DIMENSION_LABEL_V1,
    valueAxis: { ...COVERAGE_VALUE_AXIS_V1 },
    valueTicks: COVERAGE_VALUE_TICKS_V1.map((tick) => ({ ...tick })),
    states: [{ ...COVERAGE_RAW_STATE_SPECS_V1[0] }],
    rows: [
      {
        rowId: 'tank-1',
        tank: 'TK1',
        group: 'BSR',
        label: 'TK1',
        cells: [
          {
            pointId: 'point-1',
            rowId: 'tank-1',
            stateId: 'reported_zero',
            count: 1,
            denominator: 4,
            proportion: 0.3725,
            displayValue: '37,25 % (1/4 según población API)',
            traceToken: 'trace-1',
            traceEndpoint: analyticalTraceFixture({
              metricId: 'THPS.DATA.COVERAGE.V1',
              chartId: 'H11',
              chartVersion: 'V1',
              resultSetId: 'result-1',
              pointId: 'point-1',
              traceToken: 'trace-1',
            }),
            traceResultSetId: 'result-1',
            tracePointId: 'point-1',
            sourceCellCount: 1,
            lineagePreview: ['Sheet1!A1'],
            warnings: [],
          },
        ],
      },
    ],
  };
}

describe('coverage chart presenter', () => {
  it('passes the API proportion through without deriving it from counts', () => {
    const data = buildCoverageChartData(response());

    expect(data.datasets[0].data).toEqual([0.3725]);
    expect(data.datasets[0].data).not.toEqual([0.25]);
  });

  it('uses only the API-declared axis domain', () => {
    const options = buildCoverageChartOptions(response());
    const x = options.scales?.['x'];

    expect(x).toMatchObject({ min: 0, max: 1, stacked: true });
  });
});
