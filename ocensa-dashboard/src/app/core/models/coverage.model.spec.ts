import { describe, expect, it } from 'vitest';
import { analyticalTraceFixture } from '../../../testing/analytical-trace-fixture';
import {
  COVERAGE_DENOMINATOR_DEFINITION_V1,
  COVERAGE_DIMENSION_LABEL_V1,
  COVERAGE_METRIC_ID,
  COVERAGE_NUMERATOR_DEFINITION_V1,
  COVERAGE_RAW_STATE_SPECS_V1,
  COVERAGE_STATE_DIMENSION_LABEL_V1,
  COVERAGE_VALUE_AXIS_V1,
  COVERAGE_VALUE_TICKS_V1,
  CoverageMetricResponse,
  validateCoverageMetricContract,
} from './coverage.model';

function coverageTrace(
  pointId: string,
  traceToken: string,
  filters: Readonly<Record<string, string | readonly string[]>> = {
    tank: 'TK7311',
    group: 'BHT',
  },
): string {
  return analyticalTraceFixture({
    metricId: 'THPS.DATA.COVERAGE.V1',
    chartId: 'H11',
    chartVersion: 'V1',
    resultSetId: 'result-1',
    pointId,
    traceToken,
    filters,
  });
}

function rawCoverageCells(rowId: string): CoverageMetricResponse['rows'][number]['cells'] {
  const counts: Record<string, number> = {
    reported_zero: 2,
    valid_positive: 6,
    invalid: 2,
  };

  return COVERAGE_RAW_STATE_SPECS_V1.map((state, index) => {
    const count = counts[state.id] ?? 0;
    const pointId = `${rowId}-${state.id}`;
    const traceToken = `trace-${pointId}`;
    return {
      pointId,
      rowId,
      stateId: state.id,
      count,
      denominator: 10,
      proportion: count / 10,
      displayValue: `${count * 10} % (${count}/10)`,
      traceToken,
      traceEndpoint: coverageTrace(pointId, traceToken),
      traceResultSetId: 'result-1',
      tracePointId: pointId,
      sourceCellCount: count,
      lineagePreview: count > 0 ? [`Sheet1!Q${index + 10}`] : [],
      warnings: [],
    };
  });
}

export function approvedCoverageResponse(): CoverageMetricResponse {
  return {
    metricId: COVERAGE_METRIC_ID,
    metricVersion: 'V1',
    datasetReleaseId: 'release-1',
    importBatchId: 'batch-1',
    calculationRunId: 'run-1',
    resultSetId: 'result-1',
    generatedAt: '2026-08-20T12:00:00Z',
    cutoffDate: '2026-05-23',
    periodStart: '2026-01-01',
    periodEnd: '2026-05-23',
    partialPeriod: true,
    approvalStatus: 'approved_current',
    approvalLabel: 'Aprobado vigente',
    unit: '%',
    chemicalBasis: null,
    n: 8,
    eligibleN: 10,
    numerator: 8,
    numeratorDefinition: COVERAGE_NUMERATOR_DEFINITION_V1,
    denominator: 10,
    denominatorDefinition: COVERAGE_DENOMINATOR_DEFINITION_V1,
    coverage: 0.8,
    coverageDisplay: '80 %',
    warnings: ['PARTIAL_PERIOD'],
    filtersApplied: { tank: 'TK7311', group: 'BHT' },
    exportPopulationToken: 'population-1',
    dimensionLabel: COVERAGE_DIMENSION_LABEL_V1,
    stateDimensionLabel: COVERAGE_STATE_DIMENSION_LABEL_V1,
    valueAxis: { ...COVERAGE_VALUE_AXIS_V1 },
    valueTicks: COVERAGE_VALUE_TICKS_V1.map((tick) => ({ ...tick })),
    states: COVERAGE_RAW_STATE_SPECS_V1.map((state) => ({ ...state })),
    rows: [
      {
        rowId: 'tank-7311',
        tank: 'TK7311',
        group: 'BHT',
        label: 'TK7311 · BHT',
        cells: rawCoverageCells('tank-7311'),
      },
    ],
  };
}

function cloneCoverageRow(
  template: CoverageMetricResponse['rows'][number],
  rowId: string,
  tank: string,
  group: CoverageMetricResponse['rows'][number]['group'],
): CoverageMetricResponse['rows'][number] {
  return {
    ...template,
    rowId,
    tank,
    group,
    label: `${tank} · ${group}`,
    cells: template.cells.map((cell, index) => {
      const pointId = `${rowId}-point-${index + 1}`;
      const traceToken = `${rowId}-trace-${index + 1}`;
      return {
        ...cell,
        pointId,
        rowId,
        traceToken,
        traceEndpoint: coverageTrace(pointId, traceToken),
        tracePointId: pointId,
      };
    }),
  };
}

function twoTankFourGroupResponse(): CoverageMetricResponse {
  const response = approvedCoverageResponse();
  const template = response.rows[0];
  response.rows = [
    cloneCoverageRow(template, 'tk1-bsr', 'TK1', 'BSR'),
    cloneCoverageRow(template, 'tk1-bpa', 'TK1', 'BPA'),
    cloneCoverageRow(template, 'tk1-bht', 'TK1', 'BHT'),
    cloneCoverageRow(template, 'tk1-bant', 'TK1', 'BAnT'),
    cloneCoverageRow(template, 'tk2-bsr', 'TK2', 'BSR'),
    cloneCoverageRow(template, 'tk2-bpa', 'TK2', 'BPA'),
    cloneCoverageRow(template, 'tk2-bht', 'TK2', 'BHT'),
    cloneCoverageRow(template, 'tk2-bant', 'TK2', 'BAnT'),
  ];
  response.filtersApplied = {};
  for (const row of response.rows) {
    for (const cell of row.cells) {
      cell.traceEndpoint = coverageTrace(cell.pointId, cell.traceToken, {});
    }
  }
  response.eligibleN = 20;
  response.denominator = 20;
  response.coverage = 0.4;
  response.coverageDisplay = '40 %';
  return response;
}

describe('coverage metric contract', () => {
  it('accepts API-calculated proportions with complete lineage', () => {
    expect(validateCoverageMetricContract(approvedCoverageResponse())).toEqual([]);
  });

  it('fails closed when a matrix row omits a declared state', () => {
    const response = approvedCoverageResponse();
    response.rows[0].cells.pop();

    expect(validateCoverageMetricContract(response).map((issue) => issue.code)).toContain(
      'COVERAGE_MATRIX_INCOMPLETE',
    );
  });

  it('does not accept a proportion outside the API-declared axis', () => {
    const response = approvedCoverageResponse();
    response.rows[0].cells[0].proportion = 1.01;

    expect(validateCoverageMetricContract(response).map((issue) => issue.code)).toContain(
      'COVERAGE_CELL_DISPLAY_INVALID',
    );
  });

  it('requires the immutable coverage metric identity', () => {
    const response = approvedCoverageResponse();
    (response as { metricId: string }).metricId = 'UNEXPECTED';

    expect(validateCoverageMetricContract(response).map((issue) => issue.code)).toContain(
      'COVERAGE_METRIC_ID_INVALID',
    );
  });

  it('binds an opaque aggregate trace to pointId and resultSetId', () => {
    const response = approvedCoverageResponse();
    response.rows[0].cells[0].traceResultSetId = 'another-result';

    expect(validateCoverageMetricContract(response).map((issue) => issue.code)).toContain(
      'COVERAGE_CELL_LINEAGE_MISSING',
    );
  });

  it.each([
    ['javascript:alert(1)', 'ANALYTICAL_TRACE_ENDPOINT_INVALID'],
    ['https://evil.example/trace', 'ANALYTICAL_TRACE_ENDPOINT_INVALID'],
    ['//evil.example/trace', 'ANALYTICAL_TRACE_ENDPOINT_INVALID'],
    ['/api/v1/analytics/traces/V1?pointId=only', 'ANALYTICAL_TRACE_ENDPOINT_INVALID'],
  ])(
    'rejects a non-internal or malformed trace URL at response validation: %s',
    (endpoint, code) => {
      const response = approvedCoverageResponse();
      response.rows[0].cells[0].traceEndpoint = endpoint;

      expect(validateCoverageMetricContract(response).map((issue) => issue.code)).toContain(code);
    },
  );

  it('rejects cross-result, cross-point and cross-token trace references', () => {
    const mutations: Array<(response: CoverageMetricResponse) => void> = [
      (response) => {
        response.rows[0].cells[0].traceEndpoint = response.rows[0].cells[0].traceEndpoint.replace(
          'resultSetId=result-1',
          'resultSetId=result-other',
        );
      },
      (response) => {
        response.rows[0].cells[0].traceEndpoint = response.rows[0].cells[0].traceEndpoint.replace(
          `pointId=${response.rows[0].cells[0].pointId}`,
          'pointId=another-point',
        );
      },
      (response) => {
        const cell = response.rows[0].cells[0];
        cell.traceEndpoint = coverageTrace(cell.pointId, 'another-token');
      },
    ];

    for (const mutate of mutations) {
      const response = approvedCoverageResponse();
      mutate(response);
      expect(validateCoverageMetricContract(response).map((issue) => issue.code)).toContain(
        'ANALYTICAL_TRACE_IDENTITY_MISMATCH',
      );
    }
  });

  it('rejects missing, extra and duplicate trace filters', () => {
    const missing = approvedCoverageResponse();
    const missingCell = missing.rows[0].cells[0];
    missingCell.traceEndpoint = coverageTrace(missingCell.pointId, missingCell.traceToken, {
      tank: 'TK7311',
    });

    const extra = approvedCoverageResponse();
    const extraCell = extra.rows[0].cells[0];
    extraCell.traceEndpoint = coverageTrace(extraCell.pointId, extraCell.traceToken, {
      tank: 'TK7311',
      group: 'BHT',
      source: 'CIC',
    });

    const duplicate = approvedCoverageResponse();
    duplicate.rows[0].cells[0].traceEndpoint = duplicate.rows[0].cells[0].traceEndpoint.replace(
      '&page=1',
      '&tank=TK7311&page=1',
    );

    expect(validateCoverageMetricContract(missing).map((issue) => issue.code)).toContain(
      'ANALYTICAL_TRACE_FILTER_MISMATCH',
    );
    expect(validateCoverageMetricContract(extra).map((issue) => issue.code)).toContain(
      'ANALYTICAL_TRACE_FILTER_MISMATCH',
    );
    expect(validateCoverageMetricContract(duplicate).map((issue) => issue.code)).toContain(
      'ANALYTICAL_TRACE_ENDPOINT_INVALID',
    );
  });

  it('allows a canonical zero bucket with an empty bounded lineage preview', () => {
    const response = approvedCoverageResponse();
    response.rows[0].cells = response.rows[0].cells.map((cell, index) => ({
      ...cell,
      count: index === 0 ? 10 : 0,
      proportion: index === 0 ? 1 : 0,
      displayValue: index === 0 ? '100 % (10/10)' : '0 % (0/10)',
      sourceCellCount: index === 0 ? 10 : 0,
      lineagePreview: index === 0 ? ['Sheet1!Q10'] : [],
    }));

    expect(validateCoverageMetricContract(response)).toEqual([]);
  });

  it('rejects incompatible denominators, fractions and incomplete aggregate lineage', () => {
    const response = approvedCoverageResponse();
    response.rows[0].cells[0].proportion = 0.7;
    response.rows[0].cells[0].sourceCellCount = 1;
    response.rows[0].cells[1].denominator = 9;

    expect(validateCoverageMetricContract(response).map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        'COVERAGE_CELL_FRACTION_MISMATCH',
        'COVERAGE_CELL_LINEAGE_MISSING',
        'COVERAGE_ROW_POPULATION_MISMATCH',
      ]),
    );
  });

  it('requires the exact metric version and server population definitions', () => {
    const response = approvedCoverageResponse();
    (response as { metricVersion: string }).metricVersion = 'V2';
    (response as { denominatorDefinition: string }).denominatorDefinition = '';

    expect(validateCoverageMetricContract(response).map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        'COVERAGE_METRIC_ID_INVALID',
        'COVERAGE_POPULATION_DEFINITION_MISMATCH',
      ]),
    );
  });

  it('rejects a misleading tick label even when its numeric position is valid', () => {
    const response = approvedCoverageResponse();
    response.valueTicks[1].label = '25 % cumple';

    expect(validateCoverageMetricContract(response).map((issue) => issue.code)).toContain(
      'COVERAGE_AXIS_TICK_INVALID',
    );
  });

  it('rejects canonical ticks delivered in a different order', () => {
    const response = approvedCoverageResponse();
    [response.valueTicks[1], response.valueTicks[2]] = [
      response.valueTicks[2],
      response.valueTicks[1],
    ];

    expect(validateCoverageMetricContract(response).map((issue) => issue.code)).toContain(
      'COVERAGE_AXIS_TICK_INVALID',
    );
  });

  it('rejects omitted and extra ticks', () => {
    const omitted = approvedCoverageResponse();
    omitted.valueTicks.pop();
    const extra = approvedCoverageResponse();
    extra.valueTicks.push({ value: 0.6, label: '60 %' });

    expect(validateCoverageMetricContract(omitted).map((issue) => issue.code)).toContain(
      'COVERAGE_AXIS_TICK_INVALID',
    );
    expect(validateCoverageMetricContract(extra).map((issue) => issue.code)).toContain(
      'COVERAGE_AXIS_TICK_INVALID',
    );
  });

  it('rejects a changed axis title or transformation meaning', () => {
    const changedTitle = approvedCoverageResponse();
    (changedTitle.valueAxis as { title: string }).title = 'Cumplimiento del programa';
    const changedTransform = approvedCoverageResponse();
    (changedTransform.valueAxis as { transformNote: string }).transformNote =
      'Porcentaje recalculado en Angular.';

    expect(validateCoverageMetricContract(changedTitle).map((issue) => issue.code)).toContain(
      'COVERAGE_AXIS_INVALID',
    );
    expect(validateCoverageMetricContract(changedTransform).map((issue) => issue.code)).toContain(
      'COVERAGE_AXIS_INVALID',
    );
  });

  it('rejects changed visual dimension labels', () => {
    const response = approvedCoverageResponse();
    (response as { dimensionLabel: string }).dimensionLabel = 'Tanque';

    expect(validateCoverageMetricContract(response).map((issue) => issue.code)).toContain(
      'COVERAGE_DIMENSION_CONTRACT_MISMATCH',
    );
  });

  it('requires the exact seven-state H11 V1 set without omissions', () => {
    const response = approvedCoverageResponse();
    response.states.pop();

    expect(validateCoverageMetricContract(response).map((issue) => issue.code)).toContain(
      'COVERAGE_STATE_CONTRACT_MISMATCH',
    );
  });

  it('rejects extra raw states in H11 V1', () => {
    const response = approvedCoverageResponse();
    response.states.push({
      id: 'derived_status',
      label: 'Derivado',
      description: 'Estado no aprobado.',
      colorToken: 'slate',
      symbol: '?',
      order: 8,
    });

    expect(validateCoverageMetricContract(response).map((issue) => issue.code)).toContain(
      'COVERAGE_STATE_CONTRACT_MISMATCH',
    );
  });

  it('rejects a reordered or semantically relabeled H11 V1 state', () => {
    const reordered = approvedCoverageResponse();
    [reordered.states[0], reordered.states[1]] = [reordered.states[1], reordered.states[0]];
    const relabeled = approvedCoverageResponse();
    relabeled.states[0].description = 'Descripción cambiada por el cliente.';

    expect(validateCoverageMetricContract(reordered).map((issue) => issue.code)).toContain(
      'COVERAGE_STATE_CONTRACT_MISMATCH',
    );
    expect(validateCoverageMetricContract(relabeled).map((issue) => issue.code)).toContain(
      'COVERAGE_STATE_CONTRACT_MISMATCH',
    );
  });

  it('rejects a root coverage that does not describe n over eligibleN', () => {
    const response = approvedCoverageResponse();
    response.numerator = 7;
    response.coverage = 0.7;

    expect(validateCoverageMetricContract(response).map((issue) => issue.code)).toContain(
      'COVERAGE_ROOT_POPULATION_MISMATCH',
    );
  });

  it('rejects a duplicate structured tank and group pair', () => {
    const response = approvedCoverageResponse();
    response.rows.push(cloneCoverageRow(response.rows[0], 'tank-7311-copy', 'TK7311', 'BHT'));

    expect(validateCoverageMetricContract(response).map((issue) => issue.code)).toContain(
      'COVERAGE_ROW_DIMENSION_DUPLICATE',
    );
  });

  it('requires the complete cartesian matrix of tanks and expected groups', () => {
    const response = twoTankFourGroupResponse();
    response.rows.pop();

    expect(validateCoverageMetricContract(response).map((issue) => issue.code)).toContain(
      'COVERAGE_TANK_GROUP_MATRIX_INCOMPLETE',
    );
  });

  it('requires one common eligible denominator for every row of a tank', () => {
    const response = twoTankFourGroupResponse();
    const incompatible = response.rows.find((row) => row.rowId === 'tk1-bpa')!;
    incompatible.cells[0] = {
      ...incompatible.cells[0],
      count: 9,
      denominator: 11,
      proportion: 9 / 11,
      displayValue: '81.82 % (9/11)',
      sourceCellCount: 9,
    };
    incompatible.cells[1] = {
      ...incompatible.cells[1],
      count: 2,
      denominator: 11,
      proportion: 2 / 11,
      displayValue: '18.18 % (2/11)',
    };

    expect(validateCoverageMetricContract(response).map((issue) => issue.code)).toContain(
      'COVERAGE_TANK_DENOMINATOR_MISMATCH',
    );
  });

  it('reconciles root eligibleN with one denominator per unique tank', () => {
    const response = approvedCoverageResponse();
    response.eligibleN = 11;
    response.denominator = 11;
    response.coverage = 8 / 11;

    expect(validateCoverageMetricContract(response).map((issue) => issue.code)).toContain(
      'COVERAGE_ROOT_ELIGIBLE_MISMATCH',
    );
  });

  it('accepts only exact microbiology group codes in structured rows', () => {
    const response = approvedCoverageResponse();
    (response.rows[0] as { group: string }).group = 'bht';

    expect(validateCoverageMetricContract(response).map((issue) => issue.code)).toContain(
      'COVERAGE_ROW_DIMENSION_INVALID',
    );
  });

  it('does not allow an unfiltered response to hide a microbiology group globally', () => {
    const response = approvedCoverageResponse();
    response.filtersApplied = { tank: 'TK7311' };

    expect(validateCoverageMetricContract(response).map((issue) => issue.code)).toContain(
      'COVERAGE_TANK_GROUP_MATRIX_INCOMPLETE',
    );
  });

  it('rejects a multi-value group filter in this single-group contract', () => {
    const response = approvedCoverageResponse();
    response.filtersApplied['group'] = ['BSR', 'BPA'];

    expect(validateCoverageMetricContract(response).map((issue) => issue.code)).toContain(
      'COVERAGE_GROUP_FILTER_INVALID',
    );
  });

  it('binds every structured row to the requested tank', () => {
    const response = approvedCoverageResponse();
    response.rows[0].tank = 'TK7313';

    expect(validateCoverageMetricContract(response).map((issue) => issue.code)).toContain(
      'COVERAGE_TANK_FILTER_MISMATCH',
    );
  });

  it('rejects a visible row label that contradicts tank and group', () => {
    const response = approvedCoverageResponse();
    response.rows[0].label = 'TK7313 · BPA';

    expect(validateCoverageMetricContract(response).map((issue) => issue.code)).toContain(
      'COVERAGE_ROW_LABEL_MISMATCH',
    );
  });

  it('rejects visible cell and root text that contradicts the canonical fractions', () => {
    const response = approvedCoverageResponse();
    response.rows[0].cells[0].displayValue = '99 % (99/10)';
    response.coverageDisplay = '99 %';

    expect(validateCoverageMetricContract(response).map((issue) => issue.code)).toEqual(
      expect.arrayContaining(['COVERAGE_CELL_DISPLAY_MISMATCH', 'COVERAGE_ROOT_DISPLAY_MISMATCH']),
    );
  });

  it('accepts the H11 V1 midpoint rule of 1/32 as 3.13 percent', () => {
    const response = approvedCoverageResponse();
    response.n = 1;
    response.eligibleN = 32;
    response.numerator = 1;
    response.denominator = 32;
    response.coverage = 1 / 32;
    response.coverageDisplay = '3.13 %';
    response.rows[0].cells = response.rows[0].cells.map((cell) => {
      const count = cell.stateId === 'reported_zero' ? 1 : cell.stateId === 'invalid' ? 31 : 0;
      const displayPercentage = count === 1 ? '3.13' : count === 31 ? '96.88' : '0';
      return {
        ...cell,
        count,
        denominator: 32,
        proportion: count / 32,
        displayValue: `${displayPercentage} % (${count}/32)`,
        sourceCellCount: count,
        lineagePreview: count > 0 ? [`Sheet1!Q-${cell.stateId}`] : [],
      };
    });

    expect(validateCoverageMetricContract(response)).toEqual([]);
  });
});
