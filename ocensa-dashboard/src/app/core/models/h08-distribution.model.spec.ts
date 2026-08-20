import { describe, expect, it } from 'vitest';
import { analyticalTraceFixture } from '../../../testing/analytical-trace-fixture';
import {
  H08_BOX_TRACE_POINT_SUFFIX,
  H08DistributionPoint,
  H08DistributionResponse,
  validateH08DistributionContract,
} from './h08-distribution.model';

function h08Trace(
  pointId: string,
  traceToken: string,
  filters: Readonly<Record<string, string | readonly string[]>> = {
    tank: 'TK7311',
    group: 'BSR',
  },
): string {
  return analyticalTraceFixture({
    metricId: 'THPS.MICRO.GROUP.CONTROL.V1',
    chartId: 'H08',
    chartVersion: 'H08.V1',
    resultSetId: 'result-h08',
    pointId,
    traceToken,
    filters,
  });
}

function refreshH08TraceEndpoints(
  candidate: H08DistributionResponse,
  filters: Readonly<Record<string, string | readonly string[]>>,
): void {
  for (const facet of candidate.facets) {
    facet.traceEndpoint = h08Trace(facet.facetId, facet.traceSetId, filters);
    if (facet.boxSummary) {
      facet.boxSummary.traceEndpoint = h08Trace(
        `${facet.facetId}${H08_BOX_TRACE_POINT_SUFFIX}`,
        facet.boxSummary.traceToken,
        filters,
      );
    }
    for (const item of facet.points) {
      item.traceEndpoint = h08Trace(item.pointId, item.traceToken, filters);
    }
  }
}

function point(
  pointId: string,
  status: H08DistributionPoint['status'],
  numericValue: number | null,
  plotValue: number | null,
): H08DistributionPoint {
  const statusSpec = {
    valid: { label: 'Positivo exacto', warnings: [] },
    reported_zero: { label: 'Cero reportado', warnings: ['zero_excluded_from_log_axis'] },
    not_detected: { label: 'No detectado', warnings: ['lod_loq_not_approved'] },
    censored_low: {
      label: 'Censura inferior',
      warnings: ['censored_value_not_plotted_as_exact'],
    },
    censored_high: {
      label: 'Censura superior',
      warnings: ['censored_value_not_plotted_as_exact'],
    },
    missing: { label: 'Faltante', warnings: ['blank_within_observed_panel'] },
    invalid: { label: 'Inválido', warnings: ['invalid_raw_token_not_plotted'] },
    conflict: { label: 'Conflicto', warnings: [] },
  } as const;
  return {
    pointId,
    resultSetId: 'result-h08',
    facetId: 'facet-bsr',
    seriesId: 'series-bsr',
    plotX: 0.5,
    sampleDate: '2026-05-20',
    tank: 'TK7311',
    drain: null,
    source: 'CIC',
    rawValue: numericValue === null ? status : String(numericValue),
    numericValue,
    plotValue,
    lowerBound: null,
    upperBound: null,
    qualifier: null,
    unit: 'Bac/mL',
    status,
    statusLabel: statusSpec[status].label,
    plotKind:
      status === 'valid' ? 'exact' : status === 'reported_zero' ? 'reported_zero' : 'status_lane',
    sourceCellIds: [
      `Sheet1!A${pointId}`,
      `Sheet1!D${pointId}`,
      `Sheet1!Q${pointId}`,
      `Sheet1!AS${pointId}`,
    ],
    traceToken: `trace-${pointId}`,
    traceEndpoint: h08Trace(pointId, `trace-${pointId}`),
    warnings: [...statusSpec[status].warnings],
  };
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
    periodStart: '2021-01-01',
    periodEnd: '2026-05-23',
    partialPeriod: true,
    approvalStatus: 'provisional_descriptive',
    approvalLabel: 'Perfil descriptivo provisional',
    unit: 'Bac/mL',
    chemicalBasis: null,
    n: 1,
    eligibleN: 7,
    numerator: 1,
    denominator: 7,
    coverage: 1 / 7,
    coverageDisplay: '14.29 % (1/7)',
    warnings: ['lod_loq_not_approved'],
    filtersApplied: { tank: 'TK7311', group: 'BSR' },
    exportPopulationToken: 'population-h08',
    xAxis: {
      field: 'plotX',
      title: 'Dispersión visual preparada por la API',
      unit: null,
      scale: 'linear',
      min: 0,
      max: 1,
      transformNote: 'Coordenada de visualización; no representa una magnitud.',
    },
    yAxis: {
      field: 'plotValue',
      title: 'Recuento microbiológico',
      unit: 'Bac/mL',
      scale: 'logarithmic',
      min: 1,
      max: 1_000_000,
      transformNote: 'Solo positivos exactos; otros estados permanecen en carriles separados.',
    },
    yTicks: [
      { value: 1, label: '1' },
      { value: 10, label: '10' },
      { value: 100, label: '100' },
      { value: 1_000, label: '1000' },
      { value: 1_000_000, label: '1000000' },
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
        distributionN: 1,
        eligibleN: 7,
        coverage: 1 / 7,
        coverageDisplay: '14.29 % (1/7)',
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
            count: 1,
            displayCount: '1',
            color: '#315b7d',
          },
          {
            status: 'censored_low',
            label: 'Censura inferior',
            symbol: '▽',
            count: 1,
            displayCount: '1',
            color: '#d97706',
          },
          {
            status: 'censored_high',
            label: 'Censura superior',
            symbol: '△',
            count: 1,
            displayCount: '1',
            color: '#d97706',
          },
          {
            status: 'missing',
            label: 'Faltante',
            symbol: '□',
            count: 1,
            displayCount: '1',
            color: '#64748b',
          },
          {
            status: 'invalid',
            label: 'Inválido',
            symbol: '×',
            count: 1,
            displayCount: '1',
            color: '#b42318',
          },
        ],
        boxSummary: {
          resultSetId: 'result-h08',
          facetId: 'facet-bsr',
          distributionN: 1,
          min: 1_000,
          q1: 1_000,
          median: 1_000,
          q3: 1_000,
          max: 1_000,
          minDisplay: '1000',
          q1Display: '1000',
          medianDisplay: '1000',
          q3Display: '1000',
          maxDisplay: '1000',
          traceToken: 'box-trace',
          traceEndpoint: h08Trace(`facet-bsr${H08_BOX_TRACE_POINT_SUFFIX}`, 'box-trace'),
        },
        points: [
          point('1', 'valid', 1_000, 1_000),
          point('2', 'reported_zero', 0, null),
          point('3', 'not_detected', null, null),
          point('4', 'censored_low', null, null),
          point('5', 'censored_high', null, null),
          point('6', 'missing', null, null),
          point('7', 'invalid', null, null),
        ],
      },
    ],
  };
}

describe('H08 distribution contract', () => {
  it('accepts exact positives on a server-declared log axis and separates every other state', () => {
    expect(validateH08DistributionContract(response())).toEqual([]);
  });

  it('rejects an invented floor for zero, ND or censoring', () => {
    for (const pointId of ['2', '3', '4', '5']) {
      const candidate = response();
      candidate.facets[0].points.find((item) => item.pointId === pointId)!.plotValue = 1;

      expect(validateH08DistributionContract(candidate).map((item) => item.code)).toContain(
        'H08_POINT_SEMANTICS_INVALID',
      );
    }
  });

  it('requires a positive logarithmic axis, server ticks and the visible 100 Bac/mL threshold', () => {
    const candidate = response();
    candidate.yAxis.min = 0;
    candidate.yTicks = [];
    candidate.thresholds = [];

    expect(validateH08DistributionContract(candidate).map((item) => item.code)).toEqual(
      expect.arrayContaining([
        'H08_LOG_AXIS_INVALID',
        'H08_AXIS_TICKS_INVALID',
        'H08_THRESHOLD_INVALID',
      ]),
    );
  });

  it('binds facet, points and box summary to the root ResultSet', () => {
    const candidate = response();
    candidate.facets[0].points[0].resultSetId = 'stale-result';
    candidate.facets[0].boxSummary!.resultSetId = 'stale-result';

    expect(validateH08DistributionContract(candidate).map((item) => item.code)).toEqual(
      expect.arrayContaining(['H08_POINT_IDENTITY_INVALID', 'H08_BOX_SUMMARY_INVALID']),
    );
  });

  it('binds facet, box and point trace endpoints to their exact published identities', () => {
    const facetMismatch = response();
    facetMismatch.facets[0].traceEndpoint = h08Trace(
      'another-facet',
      facetMismatch.facets[0].traceSetId,
    );
    const boxMismatch = response();
    const box = boxMismatch.facets[0].boxSummary!;
    box.traceEndpoint = h08Trace(
      `${box.facetId}${H08_BOX_TRACE_POINT_SUFFIX}`,
      'another-box-token',
    );
    const pointExternal = response();
    pointExternal.facets[0].points[0].traceEndpoint = 'https://evil.example/trace';

    expect(validateH08DistributionContract(facetMismatch).map((item) => item.code)).toContain(
      'ANALYTICAL_TRACE_IDENTITY_MISMATCH',
    );
    expect(validateH08DistributionContract(boxMismatch).map((item) => item.code)).toContain(
      'ANALYTICAL_TRACE_IDENTITY_MISMATCH',
    );
    expect(validateH08DistributionContract(pointExternal).map((item) => item.code)).toContain(
      'ANALYTICAL_TRACE_ENDPOINT_INVALID',
    );
  });

  it('permits box only when the API supplies a valid summary and never permits bars as a distribution mode', () => {
    const missingSummary = response();
    missingSummary.facets[0].boxSummary = null;

    expect(validateH08DistributionContract(missingSummary).map((item) => item.code)).toContain(
      'H08_MODE_CONTRACT_INVALID',
    );

    const bars = response();
    bars.facets[0].series.allowedModes = ['points', 'bars'];

    expect(validateH08DistributionContract(bars).map((item) => item.code)).toContain(
      'H08_MODE_CONTRACT_INVALID',
    );

    const emptyBox = response();
    emptyBox.facets[0].distributionN = 0;
    emptyBox.facets[0].boxSummary!.distributionN = 0;

    expect(validateH08DistributionContract(emptyBox).map((item) => item.code)).toContain(
      'H08_BOX_SUMMARY_INVALID',
    );
  });

  it('requires all excluded-state lanes and reconciles their counts with the points', () => {
    const candidate = response();
    candidate.facets[0].statusLanes = candidate.facets[0].statusLanes.filter(
      (lane) => lane.status !== 'not_detected',
    );

    expect(validateH08DistributionContract(candidate).map((item) => item.code)).toContain(
      'H08_STATUS_LANES_INCOMPLETE',
    );
  });

  it('rejects visible labels that contradict canonical counts, coverage, ticks or box values', () => {
    const candidate = response();
    candidate.coverageDisplay = '99 % (1/7)';
    candidate.facets[0].coverageDisplay = '14.29 % (2/7)';
    candidate.facets[0].statusLanes[0].displayCount = '99';
    candidate.facets[0].boxSummary!.medianDisplay = '999';
    candidate.yTicks[0].label = '99';

    expect(validateH08DistributionContract(candidate).map((item) => item.code)).toEqual(
      expect.arrayContaining([
        'H08_ROOT_COVERAGE_DISPLAY_MISMATCH',
        'H08_FACET_COVERAGE_DISPLAY_MISMATCH',
        'H08_STATUS_LANE_INVALID',
        'H08_BOX_SUMMARY_INVALID',
        'H08_AXIS_TICKS_INVALID',
      ]),
    );
  });

  it('rejects threshold, lane and point wording that contradicts the H08.V1 catalog', () => {
    const candidate = response();
    candidate.thresholds[0].label = 'Cumple hasta 100 Bac/mL';
    candidate.facets[0].statusLanes[0].label = 'Seguro';
    candidate.facets[0].statusLanes[1].color = '#00ff00';
    candidate.facets[0].points[1].statusLabel = 'Sin riesgo';
    candidate.facets[0].points[1].warnings = [];

    expect(validateH08DistributionContract(candidate).map((item) => item.code)).toEqual(
      expect.arrayContaining([
        'H08_THRESHOLD_INVALID',
        'H08_STATUS_LANE_INVALID',
        'H08_POINT_STATUS_SPEC_INVALID',
      ]),
    );
  });

  it('rejects misleading facet/series metadata, lane order and unordered log ticks', () => {
    const candidate = response();
    candidate.facets[0].label = 'Eficacia confirmada';
    candidate.facets[0].series.label = 'Cumplimiento BSR';
    candidate.facets[0].series.color = '#00ff00';
    candidate.facets[0].series.method = 'average';
    candidate.yAxis.title = 'Eficacia del biocida';
    candidate.facets[0].statusLanes.reverse();
    [candidate.yTicks[0], candidate.yTicks[1]] = [candidate.yTicks[1], candidate.yTicks[0]];

    expect(validateH08DistributionContract(candidate).map((item) => item.code)).toEqual(
      expect.arrayContaining([
        'H08_FACET_IDENTITY_INVALID',
        'H08_MODE_CONTRACT_INVALID',
        'H08_STATUS_LANE_INVALID',
        'H08_AXIS_TICKS_INVALID',
        'H08_LOG_AXIS_INVALID',
      ]),
    );
  });

  it('rejects unknown raw statuses instead of silently treating them as a status lane', () => {
    const candidate = response();
    candidate.facets[0].points[1].status = 'unknown' as never;

    expect(validateH08DistributionContract(candidate).map((item) => item.code)).toContain(
      'H08_POINT_IDENTITY_INVALID',
    );
  });

  it('rejects any chart or metric version other than the exact H08.V1/V1 contract', () => {
    const wrongChartVersion = response();
    (wrongChartVersion as { chartVersion: string }).chartVersion = 'V1';
    const wrongMetricVersion = response();
    (wrongMetricVersion as { metricVersion: string }).metricVersion = '1';

    expect(validateH08DistributionContract(wrongChartVersion).map((item) => item.code)).toContain(
      'H08_IDENTITY_INVALID',
    );
    expect(validateH08DistributionContract(wrongMetricVersion).map((item) => item.code)).toContain(
      'H08_IDENTITY_INVALID',
    );
  });

  it('fails closed when points, exact positives, lanes or facet coverage do not reconcile', () => {
    const missingPoint = response();
    missingPoint.facets[0].points.pop();
    expect(validateH08DistributionContract(missingPoint).map((item) => item.code)).toContain(
      'H08_FACET_POINT_COUNT_MISMATCH',
    );

    const wrongDistribution = response();
    wrongDistribution.facets[0].distributionN = 2;
    wrongDistribution.facets[0].boxSummary!.distributionN = 2;
    expect(validateH08DistributionContract(wrongDistribution).map((item) => item.code)).toContain(
      'H08_FACET_POINT_COUNT_MISMATCH',
    );

    const wrongLane = response();
    wrongLane.facets[0].statusLanes.find((lane) => lane.status === 'not_detected')!.count = 0;
    expect(validateH08DistributionContract(wrongLane).map((item) => item.code)).toContain(
      'H08_FACET_STATUS_COUNT_MISMATCH',
    );

    const wrongCoverage = response();
    wrongCoverage.facets[0].coverage = 0.5;
    expect(validateH08DistributionContract(wrongCoverage).map((item) => item.code)).toContain(
      'H08_FACET_COVERAGE_MISMATCH',
    );
  });

  it('reconciles root n, eligibleN and coverage against the facet population', () => {
    const wrongPopulation = response();
    wrongPopulation.n = 0;
    expect(validateH08DistributionContract(wrongPopulation).map((item) => item.code)).toContain(
      'H08_ROOT_POPULATION_MISMATCH',
    );

    const wrongCoverage = response();
    wrongCoverage.coverage = 0.5;
    expect(validateH08DistributionContract(wrongCoverage).map((item) => item.code)).toContain(
      'H08_ROOT_COVERAGE_MISMATCH',
    );

    const wrongFraction = response();
    wrongFraction.numerator = 0;
    expect(validateH08DistributionContract(wrongFraction).map((item) => item.code)).toContain(
      'H08_ROOT_POPULATION_MISMATCH',
    );
  });

  it('requires null coverage when an empty facet and root have eligibleN zero', () => {
    const empty = response();
    empty.n = 0;
    empty.eligibleN = 0;
    empty.numerator = 0;
    empty.denominator = 0;
    empty.coverage = null;
    empty.coverageDisplay = null;
    empty.facets[0].distributionN = 0;
    empty.facets[0].eligibleN = 0;
    empty.facets[0].coverage = null;
    empty.facets[0].coverageDisplay = null;
    empty.facets[0].points = [];
    empty.facets[0].statusLanes = empty.facets[0].statusLanes.map((lane) => ({
      ...lane,
      count: 0,
      displayCount: '0',
    }));
    empty.facets[0].series.allowedModes = ['points'];
    empty.facets[0].boxSummary = null;

    expect(validateH08DistributionContract(empty)).toEqual([]);

    empty.coverage = 0;
    empty.coverageDisplay = '0 %';
    empty.facets[0].coverage = 0;
    empty.facets[0].coverageDisplay = '0 %';
    expect(validateH08DistributionContract(empty).map((item) => item.code)).toEqual(
      expect.arrayContaining(['H08_FACET_COVERAGE_MISMATCH', 'H08_ROOT_COVERAGE_MISMATCH']),
    );
  });

  it('requires A, D, the group measurement and AS lineage on one sheet row', () => {
    const lineageMutations: Array<(candidate: H08DistributionResponse) => void> = [
      (candidate) => {
        candidate.facets[0].points[0].sourceCellIds = ['Sheet1!A1', 'Sheet1!Q1', 'Sheet1!AS1'];
      },
      (candidate) => {
        candidate.facets[0].points[0].sourceCellIds = [
          'Sheet1!A1',
          'Sheet1!D2',
          'Sheet1!Q1',
          'Sheet1!AS1',
        ];
      },
      (candidate) => {
        candidate.facets[0].points[0].sourceCellIds = [
          'Sheet1!A1',
          'Sheet1!D1',
          'Sheet1!R1',
          'Sheet1!AS1',
        ];
      },
      (candidate) => {
        candidate.facets[0].points[0].sourceCellIds = ['Sheet1!A1', 'Sheet1!D1', 'Sheet1!Q1'];
      },
      (candidate) => {
        candidate.facets[0].points[0].sourceCellIds.push('Sheet1!R1');
      },
    ];

    for (const mutate of lineageMutations) {
      const candidate = response();
      mutate(candidate);
      expect(validateH08DistributionContract(candidate).map((item) => item.code)).toContain(
        'H08_POINT_LINEAGE_INVALID',
      );
    }
  });

  it('rejects a duplicated tank-group facet and point context outside the H08.V1 grain', () => {
    const duplicated = response();
    duplicated.facets.push({
      ...duplicated.facets[0],
      facetId: 'facet-bsr-duplicate',
      series: { ...duplicated.facets[0].series, id: 'series-bsr-duplicate' },
      boxSummary: null,
      points: [],
      distributionN: 0,
      eligibleN: 0,
      coverage: null,
      coverageDisplay: null,
    });

    expect(validateH08DistributionContract(duplicated).map((item) => item.code)).toContain(
      'H08_FACET_DIMENSION_DUPLICATE',
    );

    const wrongTank = response();
    wrongTank.facets[0].points[0].tank = 'TK7313';
    expect(validateH08DistributionContract(wrongTank).map((item) => item.code)).toContain(
      'H08_POINT_IDENTITY_INVALID',
    );

    const unsupportedDrain = response();
    unsupportedDrain.facets[0].points[0].drain = 'DO';
    expect(validateH08DistributionContract(unsupportedDrain).map((item) => item.code)).toContain(
      'H08_POINT_IDENTITY_INVALID',
    );
  });

  it('requires all four microbiology groups for every tank when group is not filtered', () => {
    const candidate = response();
    delete candidate.filtersApplied['group'];

    expect(validateH08DistributionContract(candidate).map((item) => item.code)).toContain(
      'H08_TANK_GROUP_MATRIX_INCOMPLETE',
    );
  });

  it('binds every facet to the canonical tank declared by filtersApplied', () => {
    const candidate = response();
    candidate.facets[0].tankLabel = 'TK7313';
    candidate.facets[0].points.forEach((item) => {
      item.tank = 'TK7313';
    });

    expect(validateH08DistributionContract(candidate).map((item) => item.code)).toContain(
      'H08_TANK_FILTER_MISMATCH',
    );
  });

  it('rejects points outside the canonical year or month applied to the result', () => {
    const wrongYear = response();
    wrongYear.filtersApplied['year'] = '2025';
    expect(validateH08DistributionContract(wrongYear).map((item) => item.code)).toContain(
      'H08_POINT_FILTER_MISMATCH',
    );

    const wrongMonth = response();
    wrongMonth.filtersApplied['month'] = '4';
    expect(validateH08DistributionContract(wrongMonth).map((item) => item.code)).toContain(
      'H08_POINT_FILTER_MISMATCH',
    );
  });

  it('requires every point to retain a canonical non-null date inside period and cutoff', () => {
    const missingDate = response();
    (missingDate.facets[0].points[0] as { sampleDate: string | null }).sampleDate = null;
    expect(validateH08DistributionContract(missingDate).map((item) => item.code)).toContain(
      'H08_POINT_DATE_INVALID',
    );

    const outsidePeriod = response();
    outsidePeriod.facets[0].points[0].sampleDate = '2026-05-24';
    expect(validateH08DistributionContract(outsidePeriod).map((item) => item.code)).toContain(
      'H08_POINT_DATE_INVALID',
    );
  });

  it('accepts ALL as an explicit unbound tank sentinel but still enforces the group matrix', () => {
    const candidate = response();
    candidate.filtersApplied['tank'] = 'ALL';
    refreshH08TraceEndpoints(candidate, { tank: 'ALL', group: 'BSR' });

    expect(validateH08DistributionContract(candidate)).toEqual([]);
  });
});
