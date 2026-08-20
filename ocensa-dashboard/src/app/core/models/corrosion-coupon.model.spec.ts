import { describe, expect, it } from 'vitest';
import { analyticalTraceFixture } from '../../../testing/analytical-trace-fixture';
import {
  CorrosionCouponFacet,
  CorrosionCouponPoint,
  CorrosionCouponResponse,
  validateCorrosionCouponContract,
} from './corrosion-coupon.model';

function couponTrace(
  pointId: string,
  traceToken: string,
  filters: Readonly<Record<string, string | readonly string[]>> = { method: 'coupon' },
): string {
  return analyticalTraceFixture({
    metricId: 'THPS.CORROSION.COUPON.MPY.V1',
    chartId: 'H10-COR-COUPON.V1',
    chartVersion: 'V1',
    resultSetId: 'result-corrosion',
    pointId,
    traceToken,
    filters,
  });
}

function refreshCouponTraceEndpoints(
  candidate: CorrosionCouponResponse,
  filters: Readonly<Record<string, string | readonly string[]>>,
): void {
  for (const item of candidate.facets.flatMap((facetItem) => facetItem.points)) {
    item.traceEndpoint = couponTrace(item.observationId, item.traceToken, filters);
  }
}

function dayNumber(value: string): number {
  return Math.floor(Date.parse(`${value}T00:00:00Z`) / 86_400_000) + 719_162;
}

function point(
  row: number,
  tank: string,
  facetId: string,
  seriesId: string,
  categoryId: 'baja' | 'moderada',
  reportedCategory: 'BAJA' | 'MODERADA',
  value = 2.37,
): CorrosionCouponPoint {
  const observationId = `Sheet1-AD${row}`;
  const traceToken = `trace-${row}`;
  return {
    observationId,
    resultSetId: 'result-corrosion',
    facetId,
    seriesId,
    plotX: dayNumber(row >= 40 ? '2026-05-19' : '2021-03-10'),
    date: row >= 40 ? '2026-05-19' : '2021-03-10',
    partialPeriod: row >= 40,
    tank,
    campaignRaw: row >= 40 ? 'II-2026 AQ' : 'I-2021 ',
    method: 'coupon',
    value,
    plotValue: value,
    valueDisplay: `${value} mpy`,
    rawValue: String(value),
    valueStatus: value === 0 ? 'reported_zero' : 'valid',
    plotKind: value === 0 ? 'reported_zero' : 'exact',
    categoryId,
    reportedCategory,
    categoryStandardVersion: 'NACE SP0775-23',
    exposureStatus: 'missing',
    exposureStart: null,
    exposureEnd: null,
    unit: 'mpy',
    source: {
      sheet: 'Sheet1',
      valueCell: `Sheet1!AD${row}`,
      categoryCell: `Sheet1!AE${row}`,
      rawValue: String(value),
      rawCategory: reportedCategory,
    },
    traceToken,
    traceEndpoint: couponTrace(observationId, traceToken),
    warnings: ['EXPOSURE_PERIOD_MISSING'],
  };
}

function facet(
  facetId: string,
  tank: string,
  points: CorrosionCouponPoint[],
  invalidN = 0,
): CorrosionCouponFacet {
  return {
    facetId,
    resultSetId: 'result-corrosion',
    tank,
    label: `${tank} · cupón AD/AE`,
    availabilityLabel: points.length
      ? `${points.length} observaciones · ${points.length + invalidN} filas CIC candidatas`
      : `Sin observación numérica de cupón · ${invalidN} filas CIC candidatas`,
    population: {
      candidateCicRows: points.length + invalidN,
      eligibleN: points.length,
      validN: points.filter((item) => item.valueStatus === 'valid').length,
      reportedZeroN: points.filter((item) => item.valueStatus === 'reported_zero').length,
      invalidN,
      missingN: 0,
      display: `${points.length} observaciones / ${points.length + invalidN} filas CIC candidatas`,
    },
    series: {
      id: `series-${tank}`,
      label: `${tank} · corrosión general por cupón`,
      unit: 'mpy',
      color: '#1c4463',
      allowedModes: ['points'],
      defaultMode: 'points',
      method: 'coupon',
    },
    points,
  };
}

function response(): CorrosionCouponResponse {
  const tk7311 = [point(2, 'TK7311', 'facet-7311', 'series-TK7311', 'moderada', 'MODERADA')];
  const tq55000 = [point(40, 'TQ55000', 'facet-55000', 'series-TQ55000', 'baja', 'BAJA', 0.8)];
  return {
    chartId: 'H10-COR-COUPON.V1',
    chartVersion: 'V1',
    metricId: 'THPS.CORROSION.COUPON.MPY.V1',
    metricVersion: 'V1',
    datasetReleaseId: 'release-1',
    importBatchId: 'batch-1',
    calculationRunId: 'run-1',
    resultSetId: 'result-corrosion',
    generatedAt: '2026-08-20T12:00:00Z',
    cutoffDate: '2026-05-23',
    periodStart: '2021-03-10',
    periodEnd: '2026-05-19',
    partialPeriod: true,
    approvalStatus: 'provisional_descriptive',
    approvalLabel: 'Descripción provisional por cupón',
    unit: 'mpy',
    unitEvidence: 'METRIC_CONTRACT_NOT_SOURCE_HEADER',
    chemicalBasis: null,
    n: 2,
    eligibleN: 2,
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
    exportPopulationToken: 'population-corrosion',
    grain: 'CorrosionObservation',
    expectedGrain: 'CouponExposureEvent',
    grainWarning: 'EXPOSURE_PERIOD_MISSING',
    exposureStatus: 'missing',
    population: {
      candidateCicRows: 4,
      eligibleN: 2,
      validN: 2,
      reportedZeroN: 0,
      invalidN: 2,
      missingN: 0,
      display: '2 observaciones / 4 filas CIC candidatas',
    },
    xAxis: {
      field: 'plotX',
      title: 'Fecha de observación',
      unit: null,
      scale: 'linear',
      min: dayNumber('2021-03-10'),
      max: dayNumber('2026-05-19'),
      transformNote: 'Coordenadas de fecha calculadas por la API.',
    },
    yAxis: {
      field: 'plotValue',
      title: 'Velocidad de corrosión general por cupón',
      unit: 'mpy',
      scale: 'linear',
      min: 0,
      max: 3,
      transformNote: 'Valor AD sin suavizado ni transformación.',
    },
    xTicks: [
      { value: dayNumber('2021-03-10'), label: '2021-03-10' },
      { value: dayNumber('2026-05-19'), label: '2026-05-19' },
    ],
    yTicks: [
      { value: 0, label: '0' },
      { value: 1.5, label: '1.5' },
      { value: 3, label: '3' },
    ],
    thresholds: [],
    categories: [
      {
        id: 'baja',
        reportedLabel: 'BAJA',
        displayLabel: 'BAJA · categoría reportada',
        color: '#0f766e',
        pointStyle: 'circle',
        symbol: '●',
        count: 1,
        displayCount: '1 observaciones',
      },
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
    facets: [facet('facet-7311', 'TK7311', tk7311, 1), facet('facet-55000', 'TQ55000', tq55000, 1)],
    tableEquivalent: true,
  };
}

describe('corrosion coupon contract', () => {
  it('accepts a provisional AD/AE-only response with a zero-based linear axis', () => {
    expect(validateCorrosionCouponContract(response())).toEqual([]);
  });

  it('fails closed if 35 invalid rows are silently turned into eligible values or zero', () => {
    const candidate = response();
    candidate.population.invalidN = 0;
    candidate.population.reportedZeroN = 2;

    expect(validateCorrosionCouponContract(candidate).map((item) => item.code)).toEqual(
      expect.arrayContaining(['COUPON_POPULATION_INVALID', 'COUPON_FACET_TOTAL_MISMATCH']),
    );
  });

  it('rejects bars, lines, thresholds and a hidden zero on the y axis', () => {
    const candidate = response();
    candidate.facets[0].series.allowedModes = ['points', 'bars'];
    candidate.yAxis.min = 0.1;
    candidate.thresholds = [{}] as never;

    expect(validateCorrosionCouponContract(candidate).map((item) => item.code)).toEqual(
      expect.arrayContaining([
        'COUPON_SERIES_INVALID',
        'COUPON_Y_AXIS_INVALID',
        'COUPON_SCOPE_INVALID',
      ]),
    );
  });

  it('rejects a category inferred or paired from anywhere other than AE on the same row', () => {
    const candidate = response();
    candidate.facets[0].points[0].source.categoryCell = 'Sheet1!AE99';
    candidate.facets[0].points[0].reportedCategory = 'BAJA';

    expect(validateCorrosionCouponContract(candidate).map((item) => item.code)).toContain(
      'COUPON_POINT_INVALID',
    );
  });

  it('rejects an external or cross-result trace for a coupon point', () => {
    const external = response();
    external.facets[0].points[0].traceEndpoint = '//evil.example/trace';
    const crossResult = response();
    crossResult.facets[0].points[0].traceEndpoint =
      crossResult.facets[0].points[0].traceEndpoint.replace(
        'resultSetId=result-corrosion',
        'resultSetId=another-result',
      );

    expect(validateCorrosionCouponContract(external).map((item) => item.code)).toContain(
      'ANALYTICAL_TRACE_ENDPOINT_INVALID',
    );
    expect(validateCorrosionCouponContract(crossResult).map((item) => item.code)).toContain(
      'ANALYTICAL_TRACE_IDENTITY_MISMATCH',
    );
  });

  it('rejects invented exposure, MIC claims and header-derived units', () => {
    const candidate = response();
    candidate.unitEvidence = 'SOURCE_HEADER' as never;
    candidate.facets[0].points[0].exposureStart = '2021-01-01' as never;
    candidate.warnings = candidate.warnings.filter((item) => item !== 'NO_MIC_INFERENCE');

    expect(validateCorrosionCouponContract(candidate).map((item) => item.code)).toEqual(
      expect.arrayContaining([
        'COUPON_UNIT_EVIDENCE_INVALID',
        'COUPON_POINT_INVALID',
        'COUPON_WARNING_MISSING',
      ]),
    );
  });

  it('accepts a declared empty TK7313 facet without creating a zero observation', () => {
    const candidate = response();
    candidate.facets.push(facet('facet-7313', 'TK7313', [], 2));
    candidate.population.candidateCicRows += 2;
    candidate.population.invalidN += 2;
    candidate.population.display = '2 observaciones / 6 filas CIC candidatas';

    expect(validateCorrosionCouponContract(candidate)).toEqual([]);
    expect(candidate.facets.at(-1)?.points).toEqual([]);
  });

  it('does not mark a filtered 2025-only population as partial', () => {
    const candidate = response();
    for (const facetItem of candidate.facets) {
      for (const item of facetItem.points) {
        item.date = '2025-05-19';
        item.plotX = dayNumber('2025-05-19');
        item.partialPeriod = false;
      }
    }
    candidate.partialPeriod = false;
    candidate.warnings = candidate.warnings.filter((item) => item !== '2026_PARTIAL');
    candidate.filtersApplied = { method: 'coupon', year: '2025' };
    refreshCouponTraceEndpoints(candidate, { method: 'coupon', year: '2025' });
    candidate.xTicks = [
      { value: dayNumber('2025-01-01'), label: '2025-01-01' },
      { value: dayNumber('2025-12-31'), label: '2025-12-31' },
    ];
    candidate.xAxis.min = dayNumber('2025-01-01');
    candidate.xAxis.max = dayNumber('2025-12-31');

    expect(validateCorrosionCouponContract(candidate)).toEqual([]);
  });

  it('fails closed when a 2026 point or warning contradicts the partial-period flag', () => {
    const candidate = response();
    candidate.partialPeriod = false;

    expect(validateCorrosionCouponContract(candidate).map((item) => item.code)).toContain(
      'COUPON_PARTIAL_PERIOD_INVALID',
    );
  });

  it('binds every facet to the canonical selected tank', () => {
    const candidate = response();
    candidate.filtersApplied['tank'] = 'TK7311';

    expect(validateCorrosionCouponContract(candidate).map((item) => item.code)).toContain(
      'COUPON_TANK_FILTER_MISMATCH',
    );
  });

  it('rejects points outside the canonical year or month applied to the result', () => {
    const wrongYear = response();
    wrongYear.filtersApplied['year'] = '2025';
    expect(validateCorrosionCouponContract(wrongYear).map((item) => item.code)).toContain(
      'COUPON_POINT_FILTER_MISMATCH',
    );

    const wrongMonth = response();
    wrongMonth.filtersApplied['month'] = '4';
    expect(validateCorrosionCouponContract(wrongMonth).map((item) => item.code)).toContain(
      'COUPON_POINT_FILTER_MISMATCH',
    );
  });

  it('rejects visible labels or coordinates that contradict their canonical values', () => {
    const candidate = response();
    candidate.population.display = '99 observaciones / 4 filas CIC candidatas';
    candidate.facets[0].availabilityLabel = '99 observaciones';
    candidate.categories[0].displayCount = '99 observaciones';
    candidate.categories[1].displayLabel = 'BAJA';
    candidate.facets[0].points[0].valueDisplay = '99 mpy';
    candidate.facets[0].points[0].plotX += 1;
    candidate.xTicks[0].label = '2025-01-01';
    candidate.yTicks[0].label = '99';

    expect(validateCorrosionCouponContract(candidate).map((item) => item.code)).toEqual(
      expect.arrayContaining([
        'COUPON_POPULATION_INVALID',
        'COUPON_FACET_DISPLAY_MISMATCH',
        'COUPON_CATEGORY_SPEC_INVALID',
        'COUPON_POINT_INVALID',
        'COUPON_X_TICKS_INVALID',
        'COUPON_Y_TICKS_INVALID',
      ]),
    );
  });

  it('rejects invented or restyled reported categories outside the H10.V1 catalog', () => {
    const invented = response();
    invented.categories[0].reportedLabel = 'SIN RIESGO';
    invented.categories[0].displayLabel = 'SIN RIESGO · categoría reportada';
    invented.categories[0].id = 'sin-riesgo';
    invented.facets[1].points[0].reportedCategory = 'SIN RIESGO';
    invented.facets[1].points[0].categoryId = 'sin-riesgo';
    invented.facets[1].points[0].source.rawCategory = 'SIN RIESGO';

    expect(validateCorrosionCouponContract(invented).map((item) => item.code)).toContain(
      'COUPON_CATEGORY_SPEC_INVALID',
    );

    const restyled = response();
    restyled.categories[1].color = '#00ff00';
    restyled.categories[1].pointStyle = 'rectRot';
    restyled.categories[1].symbol = '◆';
    expect(validateCorrosionCouponContract(restyled).map((item) => item.code)).toContain(
      'COUPON_CATEGORY_SPEC_INVALID',
    );
  });

  it('rejects misleading axis, facet or series labels outside H10.V1', () => {
    const candidate = response();
    candidate.xAxis.title = 'Dosis de biocida';
    candidate.yAxis.title = 'Cumplimiento';
    candidate.facets[0].label = 'Tanque seguro';
    candidate.facets[0].series.label = 'Promedio';
    candidate.facets[0].series.color = '#00ff00';

    expect(validateCorrosionCouponContract(candidate).map((item) => item.code)).toEqual(
      expect.arrayContaining([
        'COUPON_X_AXIS_INVALID',
        'COUPON_Y_AXIS_INVALID',
        'COUPON_FACET_IDENTITY_INVALID',
        'COUPON_SERIES_INVALID',
      ]),
    );
  });

  it('reconciles the 44-point golden population and the 20/24 reported categories', () => {
    const candidate = response();
    const points: CorrosionCouponPoint[] = Array.from({ length: 44 }, (_, index) => {
      const tank = index < 22 ? 'TK7311' : 'TQ55000';
      const facetId = index < 22 ? 'facet-7311' : 'facet-55000';
      const seriesId = `series-${tank}`;
      const isBaja = index < 20;
      return point(
        index + 2,
        tank,
        facetId,
        seriesId,
        isBaja ? 'baja' : 'moderada',
        isBaja ? 'BAJA' : 'MODERADA',
        0.33 + index * 0.05,
      );
    });
    candidate.facets = [
      facet('facet-7311', 'TK7311', points.slice(0, 22), 3),
      facet('facet-55000', 'TQ55000', points.slice(22), 3),
      facet('facet-7313', 'TK7313', [], 29),
    ];
    candidate.population = {
      candidateCicRows: 79,
      eligibleN: 44,
      validN: 44,
      reportedZeroN: 0,
      invalidN: 35,
      missingN: 0,
      display: '44 observaciones / 79 filas CIC candidatas',
    };
    candidate.n = 44;
    candidate.eligibleN = 44;
    candidate.categories[0].count = 20;
    candidate.categories[0].displayCount = '20 observaciones';
    candidate.categories[1].count = 24;
    candidate.categories[1].displayCount = '24 observaciones';
    candidate.yAxis.max = 3;

    expect(candidate.population).toMatchObject({
      candidateCicRows: 79,
      eligibleN: 44,
      validN: 44,
      reportedZeroN: 0,
      invalidN: 35,
      missingN: 0,
    });
    expect(
      candidate.categories.map(({ reportedLabel, count }) => ({ reportedLabel, count })),
    ).toEqual([
      { reportedLabel: 'BAJA', count: 20 },
      { reportedLabel: 'MODERADA', count: 24 },
    ]);
    expect(validateCorrosionCouponContract(candidate)).toEqual([]);
  });
});
