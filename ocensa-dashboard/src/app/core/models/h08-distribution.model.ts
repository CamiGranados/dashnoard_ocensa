import {
  ScientificAxisSpec,
  ScientificChartContractIssue,
  ScientificPointPlotKind,
  ScientificPointStatus,
  ScientificResultIdentity,
  ScientificSeriesSpec,
  ScientificThresholdSpec,
  validateScientificResultIdentity,
} from './scientific-chart.model';
import { appendAnalyticalTraceIssues } from './analytical-trace.model';

export const H08_CHART_ID = 'H08' as const;
export const H08_CHART_VERSION = 'H08.V1' as const;
export const H08_METRIC_ID = 'THPS.MICRO.GROUP.CONTROL.V1' as const;
export const H08_METRIC_VERSION = 'V1' as const;
export const H08_CONTROL_THRESHOLD_BAC_PER_ML = 100;
export const H08_CONTROL_THRESHOLD_ID = 'micro-strictly-greater-than-100' as const;
export const H08_CONTROL_THRESHOLD_LABEL = 'Umbral descriptivo > 100 Bac/mL' as const;
export const H08_BOX_TRACE_POINT_SUFFIX = ':box:empirical-inverse-ecdf-type1-v1' as const;

export type H08MicrobialGroup = 'BSR' | 'BPA' | 'BHT' | 'BAnT';
type H08V1PointStatus = Exclude<ScientificPointStatus, 'conflict'>;
export type H08ExcludedStatus = Exclude<H08V1PointStatus, 'valid'>;

export interface H08AxisTick {
  value: number;
  /** Label already formatted by the API in the declared Bac/mL unit. */
  label: string;
}

export interface H08StatusLane {
  status: H08ExcludedStatus;
  label: string;
  symbol: string;
  count: number;
  displayCount: string;
  color: string;
}

export interface H08BoxSummary {
  resultSetId: string;
  facetId: string;
  distributionN: number;
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  minDisplay: string;
  q1Display: string;
  medianDisplay: string;
  q3Display: string;
  maxDisplay: string;
  traceToken: string;
  traceEndpoint: string;
}

export interface H08DistributionPoint {
  pointId: string;
  resultSetId: string;
  facetId: string;
  seriesId: string;
  /** Horizontal display coordinate supplied by the API; Angular does not jitter points. */
  plotX: number;
  sampleDate: string;
  tank: string;
  drain: string | null;
  source: string | null;
  rawValue: string | null;
  numericValue: number | null;
  plotValue: number | null;
  lowerBound: number | null;
  upperBound: number | null;
  qualifier: string | null;
  unit: 'Bac/mL';
  status: ScientificPointStatus;
  statusLabel: string;
  plotKind: ScientificPointPlotKind;
  sourceCellIds: string[];
  traceToken: string;
  traceEndpoint: string;
  warnings: string[];
}

export interface H08DistributionFacet {
  facetId: string;
  resultSetId: string;
  traceSetId: string;
  traceEndpoint: string;
  group: H08MicrobialGroup;
  label: string;
  tankLabel: string;
  series: ScientificSeriesSpec;
  distributionN: number;
  eligibleN: number;
  coverage: number | null;
  coverageDisplay: string | null;
  statusLanes: H08StatusLane[];
  boxSummary: H08BoxSummary | null;
  points: H08DistributionPoint[];
}

/**
 * H08 needs facet, status-lane and optional server-summary metadata that the
 * generic ScientificChartResponse intentionally does not carry. Keeping this
 * as a dedicated contract avoids weakening other ChartSpecs or F3.1.
 */
export interface H08DistributionResponse extends ScientificResultIdentity {
  chartId: typeof H08_CHART_ID;
  chartVersion: typeof H08_CHART_VERSION;
  metricId: typeof H08_METRIC_ID;
  metricVersion: typeof H08_METRIC_VERSION;
  numerator: number;
  denominator: number;
  xAxis: ScientificAxisSpec;
  yAxis: ScientificAxisSpec;
  yTicks: H08AxisTick[];
  thresholds: ScientificThresholdSpec[];
  facets: H08DistributionFacet[];
}

const REQUIRED_STATUS_LANES: readonly H08ExcludedStatus[] = [
  'reported_zero',
  'not_detected',
  'censored_low',
  'censored_high',
  'missing',
  'invalid',
] as const;
const H08_GROUPS: readonly H08MicrobialGroup[] = ['BSR', 'BPA', 'BHT', 'BAnT'] as const;
const H08_GROUP_COLORS: Readonly<Record<H08MicrobialGroup, string>> = {
  BSR: '#1c4463',
  BPA: '#0f766e',
  BHT: '#7c3aed',
  BAnT: '#c2410c',
};
const H08_POINT_STATUSES: readonly H08V1PointStatus[] = [
  'valid',
  ...REQUIRED_STATUS_LANES,
] as const;
const H08_STATUS_CATALOG = {
  valid: {
    label: 'Positivo exacto',
    symbol: '●',
    color: '#1c4463',
    plotKind: 'exact',
    warnings: [],
  },
  reported_zero: {
    label: 'Cero reportado',
    symbol: '○',
    color: '#0f766e',
    plotKind: 'reported_zero',
    warnings: ['zero_excluded_from_log_axis'],
  },
  not_detected: {
    label: 'No detectado',
    symbol: '◇',
    color: '#315b7d',
    plotKind: 'status_lane',
    warnings: ['lod_loq_not_approved'],
  },
  censored_low: {
    label: 'Censura inferior',
    symbol: '▽',
    color: '#d97706',
    plotKind: 'status_lane',
    warnings: ['censored_value_not_plotted_as_exact'],
  },
  censored_high: {
    label: 'Censura superior',
    symbol: '△',
    color: '#d97706',
    plotKind: 'status_lane',
    warnings: ['censored_value_not_plotted_as_exact'],
  },
  missing: {
    label: 'Faltante',
    symbol: '□',
    color: '#64748b',
    plotKind: 'status_lane',
    warnings: ['blank_within_observed_panel'],
  },
  invalid: {
    label: 'Inválido',
    symbol: '×',
    color: '#b42318',
    plotKind: 'status_lane',
    warnings: ['invalid_raw_token_not_plotted'],
  },
} as const satisfies Readonly<
  Record<
    H08V1PointStatus,
    {
      label: string;
      symbol: string;
      color: string;
      plotKind: ScientificPointPlotKind;
      warnings: readonly string[];
    }
  >
>;
const H08_MEASUREMENT_COLUMN: Readonly<Record<H08MicrobialGroup, 'Q' | 'R' | 'S' | 'T'>> = {
  BSR: 'Q',
  BPA: 'R',
  BHT: 'S',
  BAnT: 'T',
};
const RECONCILIATION_TOLERANCE = 1e-9;
const INVARIANT_NUMBER_DISPLAY = /^(?:0|[1-9]\d*)(?:\.\d+)?$/;
const COVERAGE_DISPLAY = /^(\d+(?:\.\d{1,2})?) % \((\d+)\/(\d+)\)$/;
const ISO_CIVIL_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function issue(code: string, message: string): ScientificChartContractIssue {
  return { code, message };
}

function validAxisDomain(axis: ScientificAxisSpec): axis is ScientificAxisSpec & {
  min: number;
  max: number;
} {
  return (
    typeof axis.min === 'number' &&
    Number.isFinite(axis.min) &&
    typeof axis.max === 'number' &&
    Number.isFinite(axis.max) &&
    axis.min < axis.max
  );
}

function nearlyEqual(left: number, right: number): boolean {
  return Math.abs(left - right) <= RECONCILIATION_TOLERANCE;
}

function displayMatchesInvariantNumber(display: string, value: number): boolean {
  return (
    INVARIANT_NUMBER_DISPLAY.test(display) &&
    Number.isFinite(value) &&
    nearlyEqual(Number(display), value)
  );
}

function arraysEqual(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function displayMatchesCoverage(
  display: string | null,
  coverage: number | null,
  numerator: number,
  denominator: number,
): boolean {
  if (coverage === null) return display === null;
  if (!display) return false;
  const match = COVERAGE_DISPLAY.exec(display);
  if (!match || Number(match[2]) !== numerator || Number(match[3]) !== denominator) return false;

  const displayedPercent = Number(match[1]);
  const exactPercent = coverage * 100;
  return Math.abs(displayedPercent - exactPercent) < 0.005 + RECONCILIATION_TOLERANCE;
}

function parseCivilDate(value: unknown): { year: number; month: number } | null {
  if (typeof value !== 'string') return null;
  const match = ISO_CIVIL_DATE.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const timestamp = Date.UTC(year, month - 1, day);
  const parsed = new Date(timestamp);
  return parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() + 1 === month &&
    parsed.getUTCDate() === day
    ? { year, month }
    : null;
}

function parseAppliedIntegerFilter(
  filters: ScientificResultIdentity['filtersApplied'],
  dimension: 'year' | 'month',
  min: number,
  max: number,
): Set<number> | null {
  if (!Object.prototype.hasOwnProperty.call(filters, dimension)) return new Set<number>();
  const raw = filters[dimension];
  const values = Array.isArray(raw) ? raw : [raw];
  if (!values.length) return null;

  const parsed = values.map((value) =>
    typeof value === 'boolean' || value === null ? Number.NaN : Number(value),
  );
  if (
    parsed.some((value) => !Number.isInteger(value) || value < min || value > max) ||
    new Set(parsed).size !== parsed.length
  ) {
    return null;
  }
  return new Set(parsed);
}

function isExactPositivePoint(
  point: H08DistributionPoint,
  response: H08DistributionResponse,
): boolean {
  return (
    point.status === 'valid' &&
    point.plotKind === 'exact' &&
    !!point.rawValue?.trim() &&
    typeof point.numericValue === 'number' &&
    Number.isFinite(point.numericValue) &&
    point.numericValue > 0 &&
    point.plotValue === point.numericValue &&
    (typeof response.yAxis.min !== 'number' || point.plotValue >= response.yAxis.min) &&
    (typeof response.yAxis.max !== 'number' || point.plotValue <= response.yAxis.max) &&
    point.lowerBound === null &&
    point.upperBound === null
  );
}

function hasCanonicalPointLineage(point: H08DistributionPoint, group: H08MicrobialGroup): boolean {
  const parsed = point.sourceCellIds.map((sourceCellId) => {
    const match = /^([^!]+)!([A-Z]+)([1-9]\d*)$/.exec(sourceCellId);
    return match ? { sheet: match[1], column: match[2], row: match[3] } : null;
  });
  if (
    parsed.some((cell) => cell === null) ||
    new Set(point.sourceCellIds).size !== point.sourceCellIds.length
  ) {
    return false;
  }

  const cells = parsed as Array<{ sheet: string; column: string; row: string }>;
  if (
    new Set(cells.map((cell) => cell.sheet)).size !== 1 ||
    new Set(cells.map((cell) => cell.row)).size !== 1
  ) {
    return false;
  }

  const columns = new Set(cells.map((cell) => cell.column));
  const expectedColumns = new Set([
    'A',
    'D',
    H08_MEASUREMENT_COLUMN[group],
    ...(point.source === null ? [] : ['AS']),
  ]);
  return (
    columns.size === expectedColumns.size &&
    [...expectedColumns].every((column) => columns.has(column))
  );
}

function validateBoxSummary(
  facet: H08DistributionFacet,
  response: H08DistributionResponse,
): ScientificChartContractIssue[] {
  const summary = facet.boxSummary;
  if (!summary) return [];

  const values = [summary.min, summary.q1, summary.median, summary.q3, summary.max];
  const ordered = values.every(
    (value, index) =>
      Number.isFinite(value) && value > 0 && (index === 0 || value >= values[index - 1]),
  );
  const labels = [
    summary.minDisplay,
    summary.q1Display,
    summary.medianDisplay,
    summary.q3Display,
    summary.maxDisplay,
  ];

  if (
    summary.resultSetId !== response.resultSetId ||
    summary.facetId !== facet.facetId ||
    summary.distributionN !== facet.distributionN ||
    summary.distributionN <= 0 ||
    (typeof response.yAxis.min === 'number' && summary.min < response.yAxis.min) ||
    (typeof response.yAxis.max === 'number' && summary.max > response.yAxis.max) ||
    !ordered ||
    labels.some((label, index) => !displayMatchesInvariantNumber(label, values[index])) ||
    !summary.traceToken?.trim() ||
    !summary.traceEndpoint?.trim()
  ) {
    return [
      issue(
        'H08_BOX_SUMMARY_INVALID',
        `La caja de ${facet.facetId || 'la faceta'} no concilia con el ResultSet y la distribución positiva exacta.`,
      ),
    ];
  }

  return [];
}

/**
 * Validates wire identity and scientific display invariants only. It never
 * calculates logarithms, percentiles, scientific classifications or jitter;
 * population ratios and status counts are only recomputed to reject a wire
 * response whose chart, lanes and declared population disagree.
 */
export function validateH08DistributionContract(
  response: H08DistributionResponse,
): ScientificChartContractIssue[] {
  const issues = validateScientificResultIdentity(response);
  const traceIdentity = {
    datasetReleaseId: response.datasetReleaseId,
    metricId: response.metricId,
    metricVersion: response.metricVersion,
    chartId: response.chartId,
    chartVersion: response.chartVersion,
    resultSetId: response.resultSetId,
    filtersApplied: response.filtersApplied,
  } as const;

  if (
    response.chartId !== H08_CHART_ID ||
    response.chartVersion !== H08_CHART_VERSION ||
    response.metricId !== H08_METRIC_ID ||
    response.metricVersion !== H08_METRIC_VERSION
  ) {
    issues.push(
      issue('H08_IDENTITY_INVALID', 'La respuesta no corresponde al ChartSpec H08 versionado.'),
    );
  }

  const cutoff = parseCivilDate(response.cutoffDate);
  const periodStart = response.periodStart ? parseCivilDate(response.periodStart) : null;
  const periodEnd = response.periodEnd ? parseCivilDate(response.periodEnd) : null;
  const periodIsCanonical =
    cutoff !== null &&
    periodStart !== null &&
    periodEnd !== null &&
    response.periodStart! <= response.periodEnd! &&
    response.periodEnd! <= response.cutoffDate;
  if (!periodIsCanonical) {
    issues.push(
      issue(
        'H08_PERIOD_INVALID',
        'H08 requiere corte e intervalo canónicos, ordenados y no posteriores al corte.',
      ),
    );
  }

  if (
    !validAxisDomain(response.xAxis) ||
    response.xAxis.scale !== 'linear' ||
    response.xAxis.field !== 'plotX' ||
    response.xAxis.min !== 0 ||
    response.xAxis.max !== 1
  ) {
    issues.push(
      issue('H08_X_AXIS_INVALID', 'H08 requiere la coordenada visual lineal declarada por la API.'),
    );
  }

  if (
    !validAxisDomain(response.yAxis) ||
    response.yAxis.scale !== 'logarithmic' ||
    response.yAxis.field !== 'plotValue' ||
    response.yAxis.title !== 'Recuento microbiológico' ||
    response.yAxis.unit !== 'Bac/mL' ||
    response.unit !== 'Bac/mL' ||
    (typeof response.yAxis.min === 'number' && response.yAxis.min <= 0) ||
    (typeof response.yAxis.max === 'number' &&
      response.yAxis.max < H08_CONTROL_THRESHOLD_BAC_PER_ML) ||
    !response.yAxis.transformNote?.trim()
  ) {
    issues.push(
      issue(
        'H08_LOG_AXIS_INVALID',
        'H08 requiere eje logarítmico positivo en Bac/mL, preparado por la API y con el umbral dentro del dominio.',
      ),
    );
  }

  const tickValues = new Set<number>();
  let previousTickValue = Number.NEGATIVE_INFINITY;
  if (!response.yTicks.length) {
    issues.push(
      issue('H08_AXIS_TICKS_INVALID', 'La API debe entregar ticks rotulados para el eje Bac/mL.'),
    );
  }
  for (const tick of response.yTicks) {
    if (
      !Number.isFinite(tick.value) ||
      tick.value <= 0 ||
      tick.value <= previousTickValue ||
      tickValues.has(tick.value) ||
      !displayMatchesInvariantNumber(tick.label, tick.value) ||
      (typeof response.yAxis.min === 'number' && tick.value < response.yAxis.min) ||
      (typeof response.yAxis.max === 'number' && tick.value > response.yAxis.max)
    ) {
      issues.push(
        issue(
          'H08_AXIS_TICKS_INVALID',
          'Cada tick debe ser positivo, único y rotulado por la API.',
        ),
      );
    }
    tickValues.add(tick.value);
    previousTickValue = tick.value;
  }
  if (!tickValues.has(H08_CONTROL_THRESHOLD_BAC_PER_ML)) {
    issues.push(
      issue(
        'H08_AXIS_TICKS_INVALID',
        'Los ticks preparados por la API deben rotular la referencia de 100 Bac/mL.',
      ),
    );
  }
  if (
    typeof response.yAxis.min === 'number' &&
    typeof response.yAxis.max === 'number' &&
    (!tickValues.has(response.yAxis.min) || !tickValues.has(response.yAxis.max))
  ) {
    issues.push(
      issue(
        'H08_AXIS_TICKS_INVALID',
        'Los ticks preparados por la API deben rotular ambos extremos del dominio logarítmico.',
      ),
    );
  }

  const controlThreshold = response.thresholds[0];
  if (
    response.thresholds.length !== 1 ||
    controlThreshold?.id !== H08_CONTROL_THRESHOLD_ID ||
    controlThreshold?.value !== H08_CONTROL_THRESHOLD_BAC_PER_ML ||
    controlThreshold?.label !== H08_CONTROL_THRESHOLD_LABEL ||
    controlThreshold?.unit !== 'Bac/mL' ||
    controlThreshold?.comparison !== '>' ||
    controlThreshold?.approvalStatus !== 'provisional_descriptive'
  ) {
    issues.push(
      issue(
        'H08_THRESHOLD_INVALID',
        'H08 requiere una única referencia visible > 100 Bac/mL declarada por la API.',
      ),
    );
  }

  if (
    ['approved_current', 'provisional_descriptive'].includes(response.approvalStatus) &&
    !response.facets.length
  ) {
    issues.push(
      issue('H08_FACETS_EMPTY', 'Un resultado H08 visible requiere al menos una faceta.'),
    );
  }

  const filtersApplied = response.filtersApplied ?? {};
  const appliedYears = parseAppliedIntegerFilter(filtersApplied, 'year', 1900, 9999);
  const appliedMonths = parseAppliedIntegerFilter(filtersApplied, 'month', 1, 12);
  if (appliedYears === null || appliedMonths === null) {
    issues.push(
      issue(
        'H08_CALENDAR_FILTER_INVALID',
        'Los filtros year/month deben contener valores canónicos, únicos y dentro de rango.',
      ),
    );
  }
  const hasGroupFilter = Object.prototype.hasOwnProperty.call(filtersApplied, 'group');
  const appliedGroup = filtersApplied['group'];
  let expectedGroups: readonly H08MicrobialGroup[] = H08_GROUPS;
  if (hasGroupFilter) {
    if (
      typeof appliedGroup === 'string' &&
      H08_GROUPS.includes(appliedGroup as H08MicrobialGroup)
    ) {
      expectedGroups = [appliedGroup as H08MicrobialGroup];
    } else {
      issues.push(
        issue(
          'H08_GROUP_FILTER_INVALID',
          'El filtro group debe contener exactamente un código BSR, BPA, BHT o BAnT.',
        ),
      );
    }
  }

  const hasTankFilter = Object.prototype.hasOwnProperty.call(filtersApplied, 'tank');
  const appliedTank = filtersApplied['tank'];
  let expectedTank: string | null = null;
  if (hasTankFilter) {
    if (
      typeof appliedTank !== 'string' ||
      !appliedTank.trim() ||
      appliedTank !== appliedTank.trim()
    ) {
      issues.push(
        issue(
          'H08_TANK_FILTER_INVALID',
          'El filtro tank debe contener un único identificador canónico.',
        ),
      );
    } else if (appliedTank !== 'ALL') {
      expectedTank = appliedTank;
    }
  }

  const facetIds = new Set<string>();
  const facetDimensions = new Set<string>();
  const tanks = new Set<string>();
  const seriesIds = new Set<string>();
  const pointIds = new Set<string>();
  let facetDistributionTotal = 0;
  let facetEligibleTotal = 0;
  for (const facet of response.facets) {
    if (
      !facet.facetId?.trim() ||
      facetIds.has(facet.facetId) ||
      facet.resultSetId !== response.resultSetId ||
      !facet.traceSetId?.trim() ||
      !facet.traceEndpoint?.trim() ||
      !H08_GROUPS.includes(facet.group) ||
      facet.label !== `${facet.tankLabel} · ${facet.group} · positivos exactos y estados` ||
      !facet.tankLabel?.trim()
    ) {
      issues.push(
        issue('H08_FACET_IDENTITY_INVALID', 'Cada faceta debe conciliar con el ResultSet.'),
      );
    }
    facetIds.add(facet.facetId);
    appendAnalyticalTraceIssues(issues, facet.traceEndpoint, traceIdentity, {
      pointId: facet.facetId,
      traceToken: facet.traceSetId,
    });
    const facetDimension = `${facet.tankLabel}\u0000${facet.group}`;
    if (facetDimensions.has(facetDimension)) {
      issues.push(
        issue(
          'H08_FACET_DIMENSION_DUPLICATE',
          `La combinación tanque × grupo ${facet.tankLabel} × ${facet.group} está duplicada.`,
        ),
      );
    }
    facetDimensions.add(facetDimension);
    if (facet.tankLabel?.trim() && H08_GROUPS.includes(facet.group)) {
      tanks.add(facet.tankLabel);
      if (expectedTank !== null && facet.tankLabel !== expectedTank) {
        issues.push(
          issue(
            'H08_TANK_FILTER_MISMATCH',
            `La faceta ${facet.facetId || 'sin id'} pertenece a ${facet.tankLabel}, no al tanque solicitado ${expectedTank}.`,
          ),
        );
      }
      if (!expectedGroups.includes(facet.group)) {
        issues.push(
          issue(
            'H08_GROUP_FILTER_MISMATCH',
            `La faceta ${facet.facetId || 'sin id'} contiene ${facet.group}, fuera de los grupos solicitados.`,
          ),
        );
      }
    }
    facetDistributionTotal += facet.distributionN;
    facetEligibleTotal += facet.eligibleN;

    if (
      !Number.isInteger(facet.distributionN) ||
      !Number.isInteger(facet.eligibleN) ||
      facet.distributionN < 0 ||
      facet.eligibleN < 0 ||
      facet.distributionN > facet.eligibleN ||
      (facet.coverage !== null &&
        (!Number.isFinite(facet.coverage) || facet.coverage < 0 || facet.coverage > 1)) ||
      (facet.coverage !== null && !facet.coverageDisplay?.trim())
    ) {
      issues.push(
        issue(
          'H08_FACET_POPULATION_INVALID',
          `La población declarada de ${facet.facetId || 'la faceta'} no es válida.`,
        ),
      );
    }

    const expectedFacetCoverage =
      facet.eligibleN === 0 ? null : facet.distributionN / facet.eligibleN;
    if (
      (expectedFacetCoverage === null && facet.coverage !== null) ||
      (expectedFacetCoverage !== null &&
        (facet.coverage === null || !nearlyEqual(facet.coverage, expectedFacetCoverage)))
    ) {
      issues.push(
        issue(
          'H08_FACET_COVERAGE_MISMATCH',
          `La cobertura de ${facet.facetId || 'la faceta'} no concilia con distributionN/eligibleN.`,
        ),
      );
    }
    if (
      !displayMatchesCoverage(
        facet.coverageDisplay,
        facet.coverage,
        facet.distributionN,
        facet.eligibleN,
      )
    ) {
      issues.push(
        issue(
          'H08_FACET_COVERAGE_DISPLAY_MISMATCH',
          `La etiqueta de cobertura de ${facet.facetId || 'la faceta'} contradice su fracción canónica.`,
        ),
      );
    }

    const series = facet.series;
    const allowedModes = [...new Set(series.allowedModes)];
    const modesAreEquivalent =
      allowedModes.length === series.allowedModes.length &&
      allowedModes.every((mode) => mode === 'points' || mode === 'box') &&
      allowedModes.includes('points') &&
      series.defaultMode === 'points' &&
      (!allowedModes.includes('box') || facet.boxSummary !== null) &&
      (allowedModes.includes('box') || facet.boxSummary === null);
    if (
      !series.id?.trim() ||
      seriesIds.has(series.id) ||
      series.label !== `${facet.group} · positivos exactos` ||
      series.unit !== 'Bac/mL' ||
      series.color !== H08_GROUP_COLORS[facet.group] ||
      series.method !== 'positive_exact_raw_values' ||
      series.microbialGroup !== facet.group ||
      !modesAreEquivalent
    ) {
      issues.push(
        issue(
          'H08_MODE_CONTRACT_INVALID',
          `La serie de ${facet.facetId || 'la faceta'} solo puede ofrecer puntos y caja respaldada por resumen API.`,
        ),
      );
    }
    seriesIds.add(series.id);
    issues.push(...validateBoxSummary(facet, response));
    if (facet.boxSummary) {
      appendAnalyticalTraceIssues(issues, facet.boxSummary.traceEndpoint, traceIdentity, {
        pointId: `${facet.facetId}${H08_BOX_TRACE_POINT_SUFFIX}`,
        traceToken: facet.boxSummary.traceToken,
      });
    }

    const laneStatuses = new Set<H08ExcludedStatus>();
    const declaredLaneCounts = new Map<H08ExcludedStatus, number>();
    for (const [laneIndex, lane] of facet.statusLanes.entries()) {
      const laneSpec = H08_STATUS_CATALOG[lane.status as H08V1PointStatus];
      if (
        laneStatuses.has(lane.status) ||
        lane.status !== REQUIRED_STATUS_LANES[laneIndex] ||
        !REQUIRED_STATUS_LANES.includes(lane.status) ||
        !laneSpec ||
        lane.label !== laneSpec.label ||
        lane.symbol !== laneSpec.symbol ||
        lane.color !== laneSpec.color ||
        !Number.isInteger(lane.count) ||
        lane.count < 0 ||
        !displayMatchesInvariantNumber(lane.displayCount, lane.count)
      ) {
        issues.push(
          issue(
            'H08_STATUS_LANE_INVALID',
            `Los carriles de estado de ${facet.facetId || 'la faceta'} no son válidos.`,
          ),
        );
      }
      laneStatuses.add(lane.status);
      declaredLaneCounts.set(lane.status, lane.count);
    }
    if (
      facet.statusLanes.length !== REQUIRED_STATUS_LANES.length ||
      REQUIRED_STATUS_LANES.some((status) => !laneStatuses.has(status))
    ) {
      issues.push(
        issue(
          'H08_STATUS_LANES_INCOMPLETE',
          `La faceta ${facet.facetId || 'sin id'} debe separar cero, ND, censura, faltante e inválido.`,
        ),
      );
    }

    const actualStatusCounts = new Map<H08ExcludedStatus, number>();
    let exactPositiveCount = 0;

    for (const point of facet.points) {
      const pointDate = parseCivilDate(point.sampleDate);
      if (
        !point.pointId?.trim() ||
        pointIds.has(point.pointId) ||
        point.resultSetId !== response.resultSetId ||
        point.facetId !== facet.facetId ||
        point.seriesId !== series.id ||
        point.tank !== facet.tankLabel ||
        point.drain !== null ||
        !point.traceToken?.trim() ||
        !point.traceEndpoint?.trim() ||
        !point.sourceCellIds.length ||
        point.sourceCellIds.some((sourceCellId) => !sourceCellId?.trim()) ||
        !H08_POINT_STATUSES.includes(point.status as H08V1PointStatus) ||
        point.unit !== 'Bac/mL' ||
        !Number.isFinite(point.plotX) ||
        (typeof response.xAxis.min === 'number' && point.plotX < response.xAxis.min) ||
        (typeof response.xAxis.max === 'number' && point.plotX > response.xAxis.max)
      ) {
        issues.push(
          issue(
            'H08_POINT_IDENTITY_INVALID',
            `El punto ${point.pointId || 'sin id'} no concilia con faceta, serie, traza y ResultSet.`,
          ),
        );
      }
      pointIds.add(point.pointId);
      appendAnalyticalTraceIssues(issues, point.traceEndpoint, traceIdentity, {
        pointId: point.pointId,
        traceToken: point.traceToken,
      });

      const pointStatusSpec = H08_STATUS_CATALOG[point.status as H08V1PointStatus];
      if (
        !pointStatusSpec ||
        point.statusLabel !== pointStatusSpec.label ||
        point.plotKind !== pointStatusSpec.plotKind ||
        !arraysEqual(point.warnings, pointStatusSpec.warnings)
      ) {
        issues.push(
          issue(
            'H08_POINT_STATUS_SPEC_INVALID',
            `El estado visible de ${point.pointId || 'el punto'} contradice el catálogo H08.V1.`,
          ),
        );
      }

      if (
        pointDate === null ||
        !periodIsCanonical ||
        point.sampleDate < response.periodStart! ||
        point.sampleDate > response.periodEnd! ||
        point.sampleDate > response.cutoffDate
      ) {
        issues.push(
          issue(
            'H08_POINT_DATE_INVALID',
            `La fecha del punto ${point.pointId || 'sin id'} no pertenece al periodo canónico del resultado.`,
          ),
        );
      }

      const dateFilterMismatch =
        !!(appliedYears?.size || appliedMonths?.size) &&
        (pointDate === null ||
          (!!appliedYears?.size && !appliedYears.has(pointDate.year)) ||
          (!!appliedMonths?.size && !appliedMonths.has(pointDate.month)));
      if (dateFilterMismatch) {
        issues.push(
          issue(
            'H08_POINT_FILTER_MISMATCH',
            `La fecha del punto ${point.pointId || 'sin id'} no pertenece al periodo canónico aplicado.`,
          ),
        );
      }

      if (!hasCanonicalPointLineage(point, facet.group)) {
        issues.push(
          issue(
            'H08_POINT_LINEAGE_INVALID',
            `El punto ${point.pointId || 'sin id'} no prueba A, D, ${H08_MEASUREMENT_COLUMN[facet.group]} y AS cuando corresponde en una misma fila.`,
          ),
        );
      }

      const isExactPositive = isExactPositivePoint(point, response);
      const isNonExactSafelySeparated =
        point.status !== 'valid' &&
        point.plotValue === null &&
        ['reported_zero', 'status_lane', 'not_plotted'].includes(point.plotKind) &&
        (point.status !== 'reported_zero' || point.numericValue === 0);

      if (!isExactPositive && !isNonExactSafelySeparated) {
        issues.push(
          issue(
            'H08_POINT_SEMANTICS_INVALID',
            `El punto ${point.pointId || 'sin id'} inventa o mezcla una observación no exacta en la distribución.`,
          ),
        );
      }

      if (isExactPositive) {
        exactPositiveCount += 1;
      } else if (
        point.status !== 'valid' &&
        H08_POINT_STATUSES.includes(point.status as H08V1PointStatus)
      ) {
        const excludedStatus = point.status as H08ExcludedStatus;
        actualStatusCounts.set(excludedStatus, (actualStatusCounts.get(excludedStatus) ?? 0) + 1);
      }
    }

    if (facet.points.length !== facet.eligibleN || exactPositiveCount !== facet.distributionN) {
      issues.push(
        issue(
          'H08_FACET_POINT_COUNT_MISMATCH',
          `Los puntos de ${facet.facetId || 'la faceta'} no concilian con eligibleN y distributionN.`,
        ),
      );
    }

    if (
      REQUIRED_STATUS_LANES.some(
        (status) => (declaredLaneCounts.get(status) ?? 0) !== (actualStatusCounts.get(status) ?? 0),
      )
    ) {
      issues.push(
        issue(
          'H08_FACET_STATUS_COUNT_MISMATCH',
          `Los carriles de ${facet.facetId || 'la faceta'} no concilian con los estados de sus puntos.`,
        ),
      );
    }

    const declaredExcludedTotal = [...declaredLaneCounts.values()].reduce(
      (total, count) => total + count,
      0,
    );
    if (facet.distributionN + declaredExcludedTotal !== facet.eligibleN) {
      issues.push(
        issue(
          'H08_FACET_POPULATION_MISMATCH',
          `distributionN y los carriles de ${facet.facetId || 'la faceta'} no suman eligibleN.`,
        ),
      );
    }
  }

  const missingTankGroups: string[] = [];
  for (const tank of tanks) {
    for (const group of expectedGroups) {
      if (!facetDimensions.has(`${tank}\u0000${group}`)) {
        missingTankGroups.push(`${tank} × ${group}`);
      }
    }
  }
  if (missingTankGroups.length) {
    issues.push(
      issue(
        'H08_TANK_GROUP_MATRIX_INCOMPLETE',
        `Faltan facetas de la matriz tanque × grupo: ${missingTankGroups.slice(0, 10).join(', ')}.`,
      ),
    );
  }

  if (
    response.n !== facetDistributionTotal ||
    response.eligibleN !== facetEligibleTotal ||
    response.numerator !== response.n ||
    response.denominator !== response.eligibleN
  ) {
    issues.push(
      issue(
        'H08_ROOT_POPULATION_MISMATCH',
        'La población raíz H08 no concilia con la suma de sus facetas.',
      ),
    );
  }

  const expectedRootCoverage = response.eligibleN === 0 ? null : response.n / response.eligibleN;
  if (
    (expectedRootCoverage === null && response.coverage !== null) ||
    (expectedRootCoverage !== null &&
      (response.coverage === null || !nearlyEqual(response.coverage, expectedRootCoverage)))
  ) {
    issues.push(
      issue('H08_ROOT_COVERAGE_MISMATCH', 'La cobertura raíz H08 no concilia con n/eligibleN.'),
    );
  }
  if (
    !displayMatchesCoverage(
      response.coverageDisplay,
      response.coverage,
      response.n,
      response.eligibleN,
    )
  ) {
    issues.push(
      issue(
        'H08_ROOT_COVERAGE_DISPLAY_MISMATCH',
        'La etiqueta de cobertura raíz H08 contradice n/eligibleN.',
      ),
    );
  }

  return issues;
}
