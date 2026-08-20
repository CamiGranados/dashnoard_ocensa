export type AnalyticsApprovalStatus =
  | 'approved_current'
  | 'provisional'
  | 'provisional_descriptive'
  | 'pending_validation'
  | 'blocked_chemical_basis'
  | 'blocked_unit'
  | 'blocked_event_grain'
  | 'blocked_join'
  | 'historical_not_current'
  | 'stale_result'
  | 'partial_period'
  | 'insufficient_data'
  | 'no_eligible_data'
  | 'calculation_error';

export const ANALYTICS_APPROVAL_STATUSES: readonly AnalyticsApprovalStatus[] = [
  'approved_current',
  'provisional',
  'provisional_descriptive',
  'pending_validation',
  'blocked_chemical_basis',
  'blocked_unit',
  'blocked_event_grain',
  'blocked_join',
  'historical_not_current',
  'stale_result',
  'partial_period',
  'insufficient_data',
  'no_eligible_data',
  'calculation_error',
] as const;

export type ScientificChartMode =
  | 'points'
  | 'bars'
  | 'stems'
  | 'line'
  | 'box'
  | 'intervals'
  | 'matrix';

export type ScientificAxisScale = 'linear' | 'logarithmic' | 'time' | 'category';

export interface ScientificAxisSpec {
  field: string;
  title: string;
  unit: string | null;
  scale: ScientificAxisScale;
  min: number | string | null;
  max: number | string | null;
  /** Explains zero, censoring and any server-side transform. */
  transformNote: string | null;
}

export interface ScientificThresholdSpec {
  id: string;
  value: number;
  label: string;
  unit: string;
  comparison: '>' | '>=' | '<' | '<=' | '=';
  approvalStatus: AnalyticsApprovalStatus;
}

export interface ScientificSeriesSpec {
  id: string;
  label: string;
  unit: string;
  color: string;
  /** Modes are decided by the backend ChartSpec, never invented by the UI. */
  allowedModes: ScientificChartMode[];
  defaultMode: ScientificChartMode;
  method?: string | null;
  microbialGroup?: 'BSR' | 'BPA' | 'BHT' | 'BAnT' | null;
}

export type ScientificPointStatus =
  | 'valid'
  | 'reported_zero'
  | 'not_detected'
  | 'censored_low'
  | 'censored_high'
  | 'missing'
  | 'invalid'
  | 'conflict';

export type ScientificPointPlotKind =
  | 'exact'
  | 'reported_zero'
  | 'lower_bound'
  | 'upper_bound'
  | 'status_lane'
  | 'not_plotted';

export interface ScientificChartPoint {
  pointId: string;
  seriesId: string;
  x: number | string;
  /**
   * Display value on the declared axis. It is calculated by the backend.
   * Null keeps non-plottable states out of a numeric series without turning them into zero.
   */
  plotValue: number | null;
  rawValue: string | null;
  numericValue: number | null;
  lowerBound: number | null;
  upperBound: number | null;
  qualifier: string | null;
  status: ScientificPointStatus;
  plotKind: ScientificPointPlotKind;
  sampleRole: string | null;
  tank: string;
  drain: string | null;
  sourceCellIds: string[];
  warnings: string[];
}

/**
 * Identity shared by every analytical result. Values are supplied by the API and
 * may be displayed, but never reconstructed from chart points in Angular.
 */
export interface ScientificResultIdentity {
  metricId: string;
  metricVersion: string;
  datasetReleaseId: string;
  importBatchId: string;
  calculationRunId: string;
  resultSetId: string;
  generatedAt: string;
  cutoffDate: string;
  periodStart: string | null;
  periodEnd: string | null;
  partialPeriod: boolean;
  approvalStatus: AnalyticsApprovalStatus;
  approvalLabel: string;
  unit: string | null;
  chemicalBasis: string | null;
  n: number;
  eligibleN: number;
  numerator: number | null;
  denominator: number | null;
  coverage: number | null;
  /** Server-formatted coverage, for example "80 %". */
  coverageDisplay: string | null;
  warnings: string[];
  filtersApplied: Record<string, string | number | boolean | string[] | number[] | null>;
  exportPopulationToken: string;
}

export interface ScientificChartResponse extends ScientificResultIdentity {
  chartId: string;
  chartVersion: string;
  xAxis: ScientificAxisSpec;
  yAxis: ScientificAxisSpec;
  thresholds: ScientificThresholdSpec[];
  series: ScientificSeriesSpec[];
  points: ScientificChartPoint[];
}

export interface ScientificChartContractIssue {
  code: string;
  message: string;
}

export function isAnalyticsApprovalStatus(value: unknown): value is AnalyticsApprovalStatus {
  return (
    typeof value === 'string' &&
    (ANALYTICS_APPROVAL_STATUSES as readonly string[]).includes(value)
  );
}

/**
 * Validates identity and population metadata without recalculating a scientific
 * value, a ratio or a coverage figure.
 */
export function validateScientificResultIdentity(
  result: ScientificResultIdentity,
): ScientificChartContractIssue[] {
  const issues: ScientificChartContractIssue[] = [];
  const requiredIds = [
    ['metricId', result.metricId],
    ['metricVersion', result.metricVersion],
    ['datasetReleaseId', result.datasetReleaseId],
    ['importBatchId', result.importBatchId],
    ['calculationRunId', result.calculationRunId],
    ['resultSetId', result.resultSetId],
    ['exportPopulationToken', result.exportPopulationToken],
  ] as const;

  for (const [field, value] of requiredIds) {
    if (!value?.trim()) {
      issues.push({ code: 'RESULT_IDENTITY_MISSING', message: `${field} es obligatorio.` });
    }
  }

  if (!result.cutoffDate?.trim() || !result.generatedAt?.trim()) {
    issues.push({
      code: 'RESULT_TIME_IDENTITY_MISSING',
      message: 'cutoffDate y generatedAt son obligatorios.',
    });
  }

  if (
    !result.filtersApplied ||
    typeof result.filtersApplied !== 'object' ||
    Array.isArray(result.filtersApplied)
  ) {
    issues.push({
      code: 'RESULT_FILTER_IDENTITY_INVALID',
      message: 'filtersApplied debe ser un objeto canónico.',
    });
  }

  if (!isAnalyticsApprovalStatus(result.approvalStatus) || !result.approvalLabel?.trim()) {
    issues.push({
      code: 'RESULT_APPROVAL_INVALID',
      message: 'El estado y la etiqueta de aprobación son obligatorios.',
    });
  }

  if (
    !Number.isInteger(result.n) ||
    !Number.isInteger(result.eligibleN) ||
    result.n < 0 ||
    result.eligibleN < 0 ||
    result.n > result.eligibleN
  ) {
    issues.push({
      code: 'RESULT_POPULATION_INVALID',
      message: 'n debe ser menor o igual que la población elegible eligibleN.',
    });
  }

  const hasNumerator = result.numerator !== null;
  const hasDenominator = result.denominator !== null;
  if (
    hasNumerator !== hasDenominator ||
    (hasNumerator &&
      hasDenominator &&
      (!Number.isInteger(result.numerator) ||
        !Number.isInteger(result.denominator) ||
        result.numerator! < 0 ||
        result.denominator! < 0 ||
        result.numerator! > result.denominator!))
  ) {
    issues.push({
      code: 'RESULT_FRACTION_INVALID',
      message: 'numerator y denominator deben formar un conteo válido.',
    });
  }

  if (
    result.coverage !== null &&
    (!Number.isFinite(result.coverage) || result.coverage < 0 || result.coverage > 1)
  ) {
    issues.push({
      code: 'RESULT_COVERAGE_INVALID',
      message: 'coverage debe estar entre 0 y 1.',
    });
  }

  if (result.coverage !== null && !result.coverageDisplay?.trim()) {
    issues.push({
      code: 'RESULT_COVERAGE_DISPLAY_MISSING',
      message: 'La cobertura numérica requiere una etiqueta formateada por el servidor.',
    });
  }

  return issues;
}

/**
 * Defensive wire validation. It does not recalculate data; it only rejects a response
 * that could make chart, table and export represent different populations.
 */
export function validateScientificChartContract(
  chart: ScientificChartResponse,
): ScientificChartContractIssue[] {
  const issues: ScientificChartContractIssue[] = validateScientificResultIdentity(chart);
  const requiredIds = [
    ['chartId', chart.chartId],
    ['chartVersion', chart.chartVersion],
  ] as const;

  for (const [field, value] of requiredIds) {
    if (!value?.trim()) {
      issues.push({ code: 'CHART_IDENTITY_MISSING', message: `${field} es obligatorio.` });
    }
  }

  const seriesIds = new Set<string>();
  for (const series of chart.series) {
    if (!series.id.trim() || seriesIds.has(series.id)) {
      issues.push({ code: 'CHART_SERIES_ID_INVALID', message: 'Cada serie requiere un id único.' });
    }
    seriesIds.add(series.id);
    if (!series.allowedModes.length || !series.allowedModes.includes(series.defaultMode)) {
      issues.push({
        code: 'CHART_MODE_CONTRACT_INVALID',
        message: `El modo predeterminado de ${series.id || 'la serie'} no está permitido.`,
      });
    }
  }

  const pointIds = new Set<string>();
  for (const point of chart.points) {
    if (!point.pointId.trim() || pointIds.has(point.pointId)) {
      issues.push({ code: 'CHART_POINT_ID_INVALID', message: 'Cada punto requiere un id único.' });
    }
    pointIds.add(point.pointId);
    if (!seriesIds.has(point.seriesId)) {
      issues.push({
        code: 'CHART_POINT_SERIES_UNKNOWN',
        message: `El punto ${point.pointId || 'sin id'} referencia una serie inexistente.`,
      });
    }
    if (!point.sourceCellIds.length) {
      issues.push({
        code: 'CHART_POINT_LINEAGE_MISSING',
        message: `El punto ${point.pointId || 'sin id'} no tiene celdas fuente.`,
      });
    }
    const exactPlotMismatch = point.plotKind === 'exact' && point.status !== 'valid';
    const reportedZeroMismatch =
      point.status === 'reported_zero' &&
      ((chart.yAxis.scale === 'logarithmic' && point.plotValue !== null) ||
        (chart.yAxis.scale !== 'logarithmic' && point.plotValue !== null && point.plotValue !== 0) ||
        !['reported_zero', 'status_lane', 'not_plotted'].includes(point.plotKind));
    const lowerBoundMismatch =
      point.status === 'censored_high' &&
      point.plotValue !== null &&
      (point.plotKind !== 'lower_bound' || point.lowerBound === null || point.plotValue !== point.lowerBound);
    const upperBoundMismatch =
      point.status === 'censored_low' &&
      point.plotValue !== null &&
      (point.plotKind !== 'upper_bound' || point.upperBound === null || point.plotValue !== point.upperBound);
    const nonNumericStatePlotted =
      ['not_detected', 'missing', 'invalid', 'conflict'].includes(point.status) &&
      point.plotValue !== null;

    if (
      exactPlotMismatch ||
      reportedZeroMismatch ||
      lowerBoundMismatch ||
      upperBoundMismatch ||
      nonNumericStatePlotted
    ) {
      issues.push({
        code: 'CHART_NON_EXACT_POINT_PLOTTED',
        message: `El punto ${point.pointId || 'sin id'} no exacto usa un valor incompatible con su estado o límite.`,
      });
    }
  }

  return issues;
}

export function coerceScientificChartMode(
  series: ScientificSeriesSpec,
  requested: ScientificChartMode,
): ScientificChartMode {
  return series.allowedModes.includes(requested) ? requested : series.defaultMode;
}
