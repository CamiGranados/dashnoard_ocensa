import {
  ScientificAxisSpec,
  ScientificChartContractIssue,
  ScientificPointPlotKind,
  ScientificPointStatus,
  ScientificResultIdentity,
  ScientificSeriesSpec,
  validateScientificResultIdentity,
} from './scientific-chart.model';
import { appendAnalyticalTraceIssues } from './analytical-trace.model';

export const CORROSION_COUPON_CHART_ID = 'H10-COR-COUPON.V1' as const;
export const CORROSION_COUPON_METRIC_ID = 'THPS.CORROSION.COUPON.MPY.V1' as const;
export const CORROSION_COUPON_UNIT = 'mpy' as const;
export const CORROSION_COUPON_UNIT_EVIDENCE = 'METRIC_CONTRACT_NOT_SOURCE_HEADER' as const;
export const CORROSION_COUPON_X_AXIS_TITLE = 'Fecha de observación' as const;
export const CORROSION_COUPON_Y_AXIS_TITLE = 'Velocidad de corrosión general por cupón' as const;

export type CorrosionCouponPointStyle = 'circle' | 'rectRot' | 'triangle';
export type CorrosionCouponValueStatus = Extract<ScientificPointStatus, 'valid' | 'reported_zero'>;

export interface CorrosionCouponAxisTick {
  /** Numeric chart coordinate already selected by the API. */
  value: number;
  /** Display label already formatted by the API. */
  label: string;
}

export interface CorrosionCouponPopulation {
  candidateCicRows: number;
  eligibleN: number;
  validN: number;
  reportedZeroN: number;
  invalidN: number;
  missingN: number;
  /** Server wording such as "44 observaciones / 79 filas CIC candidatas". */
  display: string;
}

export interface CorrosionCouponCategorySpec {
  id: string;
  /** Category copied from AE; it is not inferred from the numeric value. */
  reportedLabel: string;
  displayLabel: string;
  color: string;
  pointStyle: CorrosionCouponPointStyle;
  symbol: string;
  count: number;
  displayCount: string;
}

type CorrosionCouponReportedCategory = 'BAJA' | 'MODERADA' | 'ALTA' | 'SEVERA';

const CORROSION_COUPON_CATEGORY_CATALOG = {
  BAJA: { id: 'baja', color: '#0f766e', pointStyle: 'circle', symbol: '●', order: 0 },
  MODERADA: {
    id: 'moderada',
    color: '#d97706',
    pointStyle: 'triangle',
    symbol: '▲',
    order: 1,
  },
  ALTA: { id: 'alta', color: '#b42318', pointStyle: 'rectRot', symbol: '◆', order: 2 },
  SEVERA: {
    id: 'severa',
    color: '#7f1d1d',
    pointStyle: 'triangle',
    symbol: '△',
    order: 3,
  },
} as const satisfies Readonly<
  Record<
    CorrosionCouponReportedCategory,
    {
      id: string;
      color: string;
      pointStyle: CorrosionCouponPointStyle;
      symbol: string;
      order: number;
    }
  >
>;

export interface CorrosionCouponSource {
  sheet: string;
  valueCell: string;
  categoryCell: string;
  rawValue: string;
  rawCategory: string;
}

export interface CorrosionCouponPoint {
  observationId: string;
  resultSetId: string;
  facetId: string;
  seriesId: string;
  /** Date coordinate supplied by the API; Angular never parses dates into chart positions. */
  plotX: number;
  date: string;
  /** API-provided marker so the UI never infers completeness from the year text. */
  partialPeriod: boolean;
  tank: string;
  campaignRaw: string;
  method: 'coupon';
  value: number;
  plotValue: number;
  valueDisplay: string;
  rawValue: string;
  valueStatus: CorrosionCouponValueStatus;
  plotKind: Extract<ScientificPointPlotKind, 'exact' | 'reported_zero'>;
  categoryId: string;
  reportedCategory: string;
  categoryStandardVersion: string;
  exposureStatus: 'missing';
  exposureStart: null;
  exposureEnd: null;
  unit: typeof CORROSION_COUPON_UNIT;
  source: CorrosionCouponSource;
  traceToken: string;
  traceEndpoint: string;
  warnings: string[];
}

export interface CorrosionCouponFacet {
  facetId: string;
  resultSetId: string;
  tank: string;
  label: string;
  /** API label; an empty facet must explicitly say that no coupon observation exists. */
  availabilityLabel: string;
  population: CorrosionCouponPopulation;
  series: ScientificSeriesSpec;
  points: CorrosionCouponPoint[];
}

/**
 * Dedicated H10 wire. It intentionally excludes electrochemical AB/AC and
 * biocoupon AF/AG, exposure durations, summaries, thresholds and causal claims.
 */
export interface CorrosionCouponResponse extends ScientificResultIdentity {
  chartId: typeof CORROSION_COUPON_CHART_ID;
  chartVersion: 'V1';
  metricId: typeof CORROSION_COUPON_METRIC_ID;
  metricVersion: 'V1';
  approvalStatus: 'provisional_descriptive';
  grain: 'CorrosionObservation';
  expectedGrain: 'CouponExposureEvent';
  grainWarning: 'EXPOSURE_PERIOD_MISSING';
  exposureStatus: 'missing';
  unit: typeof CORROSION_COUPON_UNIT;
  unitEvidence: typeof CORROSION_COUPON_UNIT_EVIDENCE;
  population: CorrosionCouponPopulation;
  xAxis: ScientificAxisSpec;
  yAxis: ScientificAxisSpec;
  xTicks: CorrosionCouponAxisTick[];
  yTicks: CorrosionCouponAxisTick[];
  thresholds: [];
  categories: CorrosionCouponCategorySpec[];
  facets: CorrosionCouponFacet[];
  tableEquivalent: true;
}

const REQUIRED_WARNINGS = [
  'EXPOSURE_PERIOD_MISSING',
  'NO_MIC_INFERENCE',
  'NO_CROSS_METHOD_TANK_RANKING',
  'NACE_CATEGORY_REPORTED_NOT_RECALCULATED',
] as const;

const ISO_CIVIL_DATE = /^\d{4}-\d{2}-\d{2}$/;
const INVARIANT_NUMBER_DISPLAY = /^(?:0|[1-9]\d*)(?:\.\d+)?$/;
const SOURCE_VALUE_CELL = /^Sheet1!AD(\d+)$/;
const SOURCE_CATEGORY_CELL = /^Sheet1!AE(\d+)$/;
function issue(code: string, message: string): ScientificChartContractIssue {
  return { code, message };
}

function isNonNegativeInteger(value: number): boolean {
  return Number.isInteger(value) && value >= 0;
}

function validPopulation(population: CorrosionCouponPopulation): boolean {
  const values = [
    population.candidateCicRows,
    population.eligibleN,
    population.validN,
    population.reportedZeroN,
    population.invalidN,
    population.missingN,
  ];
  return (
    values.every(isNonNegativeInteger) &&
    population.validN + population.reportedZeroN === population.eligibleN &&
    population.eligibleN + population.invalidN + population.missingN ===
      population.candidateCicRows &&
    population.display ===
      `${population.eligibleN} observaciones / ${population.candidateCicRows} filas CIC candidatas`
  );
}

function displayMatchesInvariantNumber(display: string, value: number): boolean {
  return (
    INVARIANT_NUMBER_DISPLAY.test(display) && Number.isFinite(value) && Number(display) === value
  );
}

function civilDateDayNumber(value: string): number | null {
  if (!ISO_CIVIL_DATE.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const timestamp = Date.UTC(year, month - 1, day);
  const parsed = new Date(timestamp);
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() + 1 !== month ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }

  // .NET DateOnly.DayNumber uses 0001-01-01 = 0; 1970-01-01 = 719162.
  return Math.floor(timestamp / 86_400_000) + 719_162;
}

function civilDateYearMonth(value: string): { year: number; month: number } | null {
  if (civilDateDayNumber(value) === null) return null;
  return { year: Number(value.slice(0, 4)), month: Number(value.slice(5, 7)) };
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

function validateTicks(
  ticks: readonly CorrosionCouponAxisTick[],
  min: number,
  max: number,
  requireZero: boolean,
  labelMatches: (tick: CorrosionCouponAxisTick) => boolean,
): boolean {
  let previous = Number.NEGATIVE_INFINITY;
  const seen = new Set<number>();
  for (const tick of ticks) {
    if (
      !Number.isFinite(tick.value) ||
      tick.value < min ||
      tick.value > max ||
      tick.value <= previous ||
      seen.has(tick.value) ||
      !labelMatches(tick)
    ) {
      return false;
    }
    previous = tick.value;
    seen.add(tick.value);
  }
  return (
    ticks.length >= 2 &&
    ticks[0].value === min &&
    ticks[ticks.length - 1].value === max &&
    (!requireZero || ticks[0].value === 0)
  );
}

function samePopulation(
  left: CorrosionCouponPopulation,
  right: CorrosionCouponPopulation,
): boolean {
  return (
    left.candidateCicRows === right.candidateCicRows &&
    left.eligibleN === right.eligibleN &&
    left.validN === right.validN &&
    left.reportedZeroN === right.reportedZeroN &&
    left.invalidN === right.invalidN &&
    left.missingN === right.missingN
  );
}

/**
 * Fail-closed validation of identity, population, axes, categories and raw
 * lineage. It counts wire entities only to reconcile the contract; it never
 * calculates corrosion values, exposure, categories, limits or summaries.
 */
export function validateCorrosionCouponContract(
  response: CorrosionCouponResponse,
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
    response.chartId !== CORROSION_COUPON_CHART_ID ||
    response.chartVersion !== 'V1' ||
    response.metricId !== CORROSION_COUPON_METRIC_ID ||
    response.metricVersion !== 'V1'
  ) {
    issues.push(
      issue(
        'COUPON_IDENTITY_INVALID',
        'La respuesta no corresponde al MetricId y ChartSpec versionados de cupón AD/AE.',
      ),
    );
  }

  if (
    response.approvalStatus !== 'provisional_descriptive' ||
    response.grain !== 'CorrosionObservation' ||
    response.expectedGrain !== 'CouponExposureEvent' ||
    response.grainWarning !== 'EXPOSURE_PERIOD_MISSING' ||
    response.exposureStatus !== 'missing'
  ) {
    issues.push(
      issue(
        'COUPON_EVIDENCE_STATE_INVALID',
        'El slice debe permanecer descriptivo y declarar que el periodo de exposición no existe.',
      ),
    );
  }

  if (
    response.unit !== CORROSION_COUPON_UNIT ||
    response.unitEvidence !== CORROSION_COUPON_UNIT_EVIDENCE ||
    response.chemicalBasis !== null
  ) {
    issues.push(
      issue(
        'COUPON_UNIT_EVIDENCE_INVALID',
        'mpy solo puede mostrarse con evidencia del contrato métrico, no como evidencia del encabezado.',
      ),
    );
  }

  if (
    !validPopulation(response.population) ||
    response.n !== response.population.eligibleN ||
    response.eligibleN !== response.population.eligibleN ||
    response.numerator !== null ||
    response.denominator !== null ||
    response.coverage !== null ||
    response.coverageDisplay !== null
  ) {
    issues.push(
      issue(
        'COUPON_POPULATION_INVALID',
        'La población CIC candidata, elegible, inválida y faltante no concilia exactamente.',
      ),
    );
  }

  if (
    response.cutoffDate !== '2026-05-23' ||
    !response.tableEquivalent ||
    response.thresholds.length !== 0 ||
    response.filtersApplied?.['method'] !== 'coupon'
  ) {
    issues.push(
      issue(
        'COUPON_SCOPE_INVALID',
        'El corte debe ser 2026-05-23, método coupon, sin umbrales recalculados y con tabla equivalente.',
      ),
    );
  }

  for (const warning of REQUIRED_WARNINGS) {
    if (!response.warnings.includes(warning)) {
      issues.push(issue('COUPON_WARNING_MISSING', `Falta la advertencia obligatoria ${warning}.`));
    }
  }
  const hasPartialWarning = response.warnings.includes('2026_PARTIAL');
  if (hasPartialWarning !== response.partialPeriod) {
    issues.push(
      issue(
        'COUPON_PARTIAL_PERIOD_INVALID',
        '2026_PARTIAL debe aparecer únicamente cuando la población filtrada incluye el periodo parcial 2026.',
      ),
    );
  }

  if (
    !validAxisDomain(response.xAxis) ||
    response.xAxis.field !== 'plotX' ||
    response.xAxis.scale !== 'linear' ||
    response.xAxis.unit !== null ||
    response.xAxis.title !== CORROSION_COUPON_X_AXIS_TITLE ||
    !response.xAxis.transformNote?.trim()
  ) {
    issues.push(
      issue(
        'COUPON_X_AXIS_INVALID',
        'La fecha debe usar coordenadas y dominio lineal suministrados por la API.',
      ),
    );
  } else if (
    !validateTicks(
      response.xTicks,
      response.xAxis.min,
      response.xAxis.max,
      false,
      (tick) => civilDateDayNumber(tick.label) === tick.value,
    )
  ) {
    issues.push(
      issue(
        'COUPON_X_TICKS_INVALID',
        'Los ticks de fecha deben venir ordenados y rotulados por la API.',
      ),
    );
  }

  if (
    !validAxisDomain(response.yAxis) ||
    response.yAxis.field !== 'plotValue' ||
    response.yAxis.scale !== 'linear' ||
    response.yAxis.unit !== CORROSION_COUPON_UNIT ||
    response.yAxis.min !== 0 ||
    response.yAxis.title !== CORROSION_COUPON_Y_AXIS_TITLE ||
    !response.yAxis.transformNote?.trim()
  ) {
    issues.push(
      issue(
        'COUPON_Y_AXIS_INVALID',
        'La corrosión por cupón requiere un eje lineal en mpy con cero visible y dominio de la API.',
      ),
    );
  } else if (
    !validateTicks(response.yTicks, response.yAxis.min, response.yAxis.max, true, (tick) =>
      displayMatchesInvariantNumber(tick.label, tick.value),
    )
  ) {
    issues.push(
      issue(
        'COUPON_Y_TICKS_INVALID',
        'Los ticks del eje mpy deben venir ordenados por la API e incluir cero.',
      ),
    );
  }

  const categoryIds = new Set<string>();
  const categoryLabels = new Set<string>();
  let previousCategoryOrder = -1;
  for (const category of response.categories) {
    const categorySpec =
      CORROSION_COUPON_CATEGORY_CATALOG[category.reportedLabel as CorrosionCouponReportedCategory];
    if (
      !categorySpec ||
      category.id !== categorySpec?.id ||
      categoryIds.has(category.id) ||
      categoryLabels.has(category.reportedLabel) ||
      category.displayLabel !== `${category.reportedLabel} · categoría reportada` ||
      category.color !== categorySpec?.color ||
      category.pointStyle !== categorySpec?.pointStyle ||
      category.symbol !== categorySpec?.symbol ||
      categorySpec.order <= previousCategoryOrder ||
      !Number.isInteger(category.count) ||
      category.count <= 0 ||
      category.displayCount !== `${category.count} observaciones`
    ) {
      issues.push(
        issue(
          'COUPON_CATEGORY_SPEC_INVALID',
          'Cada categoría AE requiere identidad, texto, color, forma y conteo explícitos.',
        ),
      );
    }
    categoryIds.add(category.id);
    categoryLabels.add(category.reportedLabel);
    if (categorySpec) previousCategoryOrder = categorySpec.order;
  }

  const facetIds = new Set<string>();
  const facetTanks = new Set<string>();
  const pointIds = new Set<string>();
  const actualCategoryCounts = new Map<string, number>();
  let hasPartialPoint = false;
  const populationTotal: CorrosionCouponPopulation = {
    candidateCicRows: 0,
    eligibleN: 0,
    validN: 0,
    reportedZeroN: 0,
    invalidN: 0,
    missingN: 0,
    display: 'reconciled',
  };
  const filtersApplied = response.filtersApplied ?? {};
  const appliedYears = parseAppliedIntegerFilter(filtersApplied, 'year', 1900, 9999);
  const appliedMonths = parseAppliedIntegerFilter(filtersApplied, 'month', 1, 12);
  if (appliedYears === null || appliedMonths === null) {
    issues.push(
      issue(
        'COUPON_CALENDAR_FILTER_INVALID',
        'Los filtros year/month deben contener valores canónicos, únicos y dentro de rango.',
      ),
    );
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
          'COUPON_TANK_FILTER_INVALID',
          'El filtro tank debe contener un único identificador canónico.',
        ),
      );
    } else if (appliedTank !== 'ALL') {
      expectedTank = appliedTank;
    }
  }

  for (const facet of response.facets) {
    if (
      !facet.facetId?.trim() ||
      facetIds.has(facet.facetId) ||
      facet.resultSetId !== response.resultSetId ||
      !facet.tank?.trim() ||
      facetTanks.has(facet.tank) ||
      facet.label !== `${facet.tank} · cupón AD/AE` ||
      !facet.availabilityLabel?.trim() ||
      !validPopulation(facet.population)
    ) {
      issues.push(
        issue(
          'COUPON_FACET_IDENTITY_INVALID',
          'Cada faceta debe representar un tanque único y la misma identidad de resultado.',
        ),
      );
    }
    facetIds.add(facet.facetId);
    facetTanks.add(facet.tank);
    if (expectedTank !== null && facet.tank !== expectedTank) {
      issues.push(
        issue(
          'COUPON_TANK_FILTER_MISMATCH',
          `La faceta ${facet.facetId || 'sin id'} pertenece a ${facet.tank}, no al tanque solicitado ${expectedTank}.`,
        ),
      );
    }

    const expectedAvailability = facet.points.length
      ? `${facet.points.length} observaciones · ${facet.population.candidateCicRows} filas CIC candidatas`
      : `Sin observación numérica de cupón · ${facet.population.candidateCicRows} filas CIC candidatas`;
    if (facet.availabilityLabel !== expectedAvailability) {
      issues.push(
        issue(
          'COUPON_FACET_DISPLAY_MISMATCH',
          `La etiqueta visible de ${facet.facetId || 'la faceta'} contradice su población canónica.`,
        ),
      );
    }

    const allowedModes = facet.series.allowedModes;
    if (
      !facet.series.id?.trim() ||
      facet.series.label !== `${facet.tank} · corrosión general por cupón` ||
      facet.series.unit !== CORROSION_COUPON_UNIT ||
      facet.series.color !== '#1c4463' ||
      facet.series.method !== 'coupon' ||
      facet.series.defaultMode !== 'points' ||
      allowedModes.length !== 1 ||
      allowedModes[0] !== 'points'
    ) {
      issues.push(
        issue(
          'COUPON_SERIES_INVALID',
          'Cupón solo permite puntos por evento; no líneas, barras, suavizado ni métodos vecinos.',
        ),
      );
    }

    if (facet.population.eligibleN !== facet.points.length) {
      issues.push(
        issue(
          'COUPON_FACET_POPULATION_MISMATCH',
          'Los puntos de la faceta no concilian con su población elegible declarada.',
        ),
      );
    }

    populationTotal.candidateCicRows += facet.population.candidateCicRows;
    populationTotal.eligibleN += facet.population.eligibleN;
    populationTotal.validN += facet.population.validN;
    populationTotal.reportedZeroN += facet.population.reportedZeroN;
    populationTotal.invalidN += facet.population.invalidN;
    populationTotal.missingN += facet.population.missingN;

    for (const point of facet.points) {
      const category = response.categories.find((item) => item.id === point.categoryId);
      const valueMatch = SOURCE_VALUE_CELL.exec(point.source.valueCell);
      const categoryMatch = SOURCE_CATEGORY_CELL.exec(point.source.categoryCell);
      const sourcePairValid =
        point.source.sheet === 'Sheet1' &&
        valueMatch !== null &&
        categoryMatch !== null &&
        valueMatch[1] === categoryMatch[1];
      const validValue =
        Number.isFinite(point.value) &&
        point.value >= 0 &&
        point.value === point.plotValue &&
        (point.valueStatus === 'valid'
          ? point.value > 0 && point.plotKind === 'exact'
          : point.value === 0 && point.plotKind === 'reported_zero');
      const pointDayNumber = civilDateDayNumber(point.date);
      const pointDate = civilDateYearMonth(point.date);
      const withinAxes =
        validAxisDomain(response.xAxis) &&
        validAxisDomain(response.yAxis) &&
        Number.isFinite(point.plotX) &&
        point.plotX >= response.xAxis.min &&
        point.plotX <= response.xAxis.max &&
        point.plotValue >= response.yAxis.min &&
        point.plotValue <= response.yAxis.max;
      const is2026Observation = point.date.startsWith('2026-');
      hasPartialPoint ||= is2026Observation;

      if (
        !point.observationId?.trim() ||
        pointIds.has(point.observationId) ||
        point.resultSetId !== response.resultSetId ||
        point.facetId !== facet.facetId ||
        point.seriesId !== facet.series.id ||
        point.tank !== facet.tank ||
        point.method !== 'coupon' ||
        point.unit !== CORROSION_COUPON_UNIT ||
        pointDayNumber === null ||
        point.plotX !== pointDayNumber ||
        !point.campaignRaw?.trim() ||
        point.valueDisplay !== `${point.value} ${CORROSION_COUPON_UNIT}` ||
        !point.rawValue?.trim() ||
        !validValue ||
        !withinAxes ||
        !category ||
        category.reportedLabel !== point.reportedCategory ||
        point.categoryStandardVersion !== 'NACE SP0775-23' ||
        point.exposureStatus !== 'missing' ||
        point.exposureStart !== null ||
        point.exposureEnd !== null ||
        point.source.rawValue !== point.rawValue ||
        point.source.rawCategory.trim() !== point.reportedCategory ||
        !sourcePairValid ||
        !point.traceToken?.trim() ||
        !point.traceEndpoint?.trim() ||
        point.partialPeriod !== is2026Observation ||
        (point.partialPeriod && !response.partialPeriod)
      ) {
        issues.push(
          issue(
            'COUPON_POINT_INVALID',
            `La observación ${point.observationId || 'sin id'} no conserva valor, categoría AE, eje, exposición o trazabilidad AD/AE.`,
          ),
        );
      }
      pointIds.add(point.observationId);
      appendAnalyticalTraceIssues(issues, point.traceEndpoint, traceIdentity, {
        pointId: point.observationId,
        traceToken: point.traceToken,
      });
      if (
        (appliedYears?.size || appliedMonths?.size) &&
        (pointDate === null ||
          (!!appliedYears?.size && !appliedYears.has(pointDate.year)) ||
          (!!appliedMonths?.size && !appliedMonths.has(pointDate.month)))
      ) {
        issues.push(
          issue(
            'COUPON_POINT_FILTER_MISMATCH',
            `La fecha de ${point.observationId || 'la observación'} no pertenece al periodo canónico aplicado.`,
          ),
        );
      }
      actualCategoryCounts.set(
        point.categoryId,
        (actualCategoryCounts.get(point.categoryId) ?? 0) + 1,
      );
    }
  }

  if (hasPartialPoint && !response.partialPeriod) {
    issues.push(
      issue(
        'COUPON_PARTIAL_PERIOD_INVALID',
        'Una observación 2026 exige declarar el periodo filtrado como parcial.',
      ),
    );
  }

  if (!samePopulation(populationTotal, response.population)) {
    issues.push(
      issue(
        'COUPON_FACET_TOTAL_MISMATCH',
        'La suma de facetas no reproduce la población raíz del mismo ResultSet.',
      ),
    );
  }

  const categoryCountTotal = response.categories.reduce((sum, category) => sum + category.count, 0);
  if (
    categoryCountTotal !== response.population.eligibleN ||
    response.categories.some(
      (category) => (actualCategoryCounts.get(category.id) ?? 0) !== category.count,
    )
  ) {
    issues.push(
      issue(
        'COUPON_CATEGORY_COUNT_MISMATCH',
        'Los conteos de categorías reportadas no coinciden con los puntos de la misma población.',
      ),
    );
  }

  return issues;
}
