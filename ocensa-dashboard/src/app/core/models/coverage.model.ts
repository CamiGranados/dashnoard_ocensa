import {
  AnalyticsApprovalStatus,
  ScientificAxisSpec,
  ScientificChartContractIssue,
  ScientificResultIdentity,
  validateScientificResultIdentity,
} from './scientific-chart.model';
import { appendAnalyticalTraceIssues } from './analytical-trace.model';

export const COVERAGE_METRIC_ID = 'THPS.DATA.COVERAGE.V1' as const;
export const COVERAGE_METRIC_VERSION = 'V1' as const;
export const MAX_COVERAGE_LINEAGE_PREVIEW_CELLS = 10;
export const COVERAGE_MICROBIOLOGY_GROUPS = ['BSR', 'BPA', 'BHT', 'BAnT'] as const;
export const COVERAGE_NUMERATOR_DEFINITION_V1 =
  'Filas del panel observado con clasificación de umbral evaluable en todos los grupos incluidos en la consulta.' as const;
export const COVERAGE_DENOMINATOR_DEFINITION_V1 =
  'Filas filtradas con fecha de colección canónica y al menos un valor raw en Q:T dentro del corte publicado.' as const;
export const COVERAGE_DIMENSION_LABEL_V1 = 'Tanque × grupo microbiológico' as const;
export const COVERAGE_STATE_DIMENSION_LABEL_V1 = 'Estado raw' as const;

export type CoverageMicrobiologyGroup = (typeof COVERAGE_MICROBIOLOGY_GROUPS)[number];

export type CoverageColorToken = 'navy' | 'teal' | 'orange' | 'green' | 'red' | 'slate';

export interface CoverageStateSpec {
  id: string;
  label: string;
  description: string;
  colorToken: CoverageColorToken;
  symbol: string;
  order: number;
}

/** Exact ordered state dimension emitted by H11 V1. */
export const COVERAGE_RAW_STATE_SPECS_V1 = [
  {
    id: 'reported_zero',
    label: 'Cero reportado',
    description: 'Cero explícito de la fuente; clasifica el umbral, pero no se grafica en log.',
    colorToken: 'teal',
    symbol: '○',
    order: 1,
  },
  {
    id: 'valid_positive',
    label: 'Positivo exacto',
    description: 'Valor numérico exacto mayor que cero.',
    colorToken: 'green',
    symbol: '●',
    order: 2,
  },
  {
    id: 'censored_low',
    label: 'Censura inferior',
    description: 'Límite superior reportado; no es un punto exacto.',
    colorToken: 'orange',
    symbol: '▽',
    order: 3,
  },
  {
    id: 'censored_high',
    label: 'Censura superior',
    description: 'Límite inferior reportado; no es un punto exacto.',
    colorToken: 'orange',
    symbol: '△',
    order: 4,
  },
  {
    id: 'not_detected',
    label: 'No detectado',
    description: 'Resultado reportado como no detectado, sin LOD/LOQ aprobado.',
    colorToken: 'navy',
    symbol: '◇',
    order: 5,
  },
  {
    id: 'invalid',
    label: 'Inválido',
    description: 'Token de fuente no interpretable bajo el clasificador vigente.',
    colorToken: 'red',
    symbol: '×',
    order: 6,
  },
  {
    id: 'missing',
    label: 'Faltante',
    description: 'Celda vacía dentro de un panel observado.',
    colorToken: 'slate',
    symbol: '□',
    order: 7,
  },
] as const satisfies readonly CoverageStateSpec[];

/**
 * One API-calculated cell. Angular displays `proportion` and `displayValue`
 * verbatim and never derives them from count/denominator.
 */
export interface CoverageCell {
  pointId: string;
  rowId: string;
  stateId: string;
  count: number;
  denominator: number;
  proportion: number;
  displayValue: string;
  /** Opaque server token bound to pointId + resultSetId for full trace retrieval. */
  traceToken: string;
  traceEndpoint: string;
  traceResultSetId: string;
  tracePointId: string;
  sourceCellCount: number;
  /** Small, explicitly bounded preview; never the complete lineage of an aggregate. */
  lineagePreview: string[];
  warnings: string[];
}

export interface CoverageRow {
  rowId: string;
  /** Canonical tank identifier supplied independently from the display label. */
  tank: string;
  /** Exact microbiology group code; never parsed from `label`. */
  group: CoverageMicrobiologyGroup;
  label: string;
  cells: CoverageCell[];
}

export interface CoverageAxisTick {
  value: number;
  label: string;
}

export const COVERAGE_VALUE_AXIS_V1 = {
  field: 'proportion',
  title: 'Proporción del panel observado',
  unit: '%',
  scale: 'linear',
  min: 0,
  max: 1,
  transformNote: 'Porcentajes calculados por la API; no representan cumplimiento de muestreo.',
} as const satisfies ScientificAxisSpec;

export const COVERAGE_VALUE_TICKS_V1 = [
  { value: 0, label: '0 %' },
  { value: 0.25, label: '25 %' },
  { value: 0.5, label: '50 %' },
  { value: 0.75, label: '75 %' },
  { value: 1, label: '100 %' },
] as const satisfies readonly CoverageAxisTick[];

export interface CoverageMetricResponse extends ScientificResultIdentity {
  metricId: typeof COVERAGE_METRIC_ID;
  metricVersion: typeof COVERAGE_METRIC_VERSION;
  approvalStatus: AnalyticsApprovalStatus;
  numerator: number;
  denominator: number;
  numeratorDefinition: typeof COVERAGE_NUMERATOR_DEFINITION_V1;
  denominatorDefinition: typeof COVERAGE_DENOMINATOR_DEFINITION_V1;
  dimensionLabel: typeof COVERAGE_DIMENSION_LABEL_V1;
  stateDimensionLabel: typeof COVERAGE_STATE_DIMENSION_LABEL_V1;
  valueAxis: typeof COVERAGE_VALUE_AXIS_V1;
  /** Server-formatted tick labels; Angular never multiplies a fraction by 100. */
  valueTicks: CoverageAxisTick[];
  states: CoverageStateSpec[];
  rows: CoverageRow[];
}

const COVERAGE_COLOR_TOKENS: readonly CoverageColorToken[] = [
  'navy',
  'teal',
  'orange',
  'green',
  'red',
  'slate',
] as const;

function nearlyEqual(left: number, right: number): boolean {
  return Math.abs(left - right) <= 1e-9;
}

/** Mirrors the H11 V1 server format: percent, two decimals, midpoint away from zero. */
function formatCoveragePercentageV1(numerator: number, denominator: number): string | null {
  if (
    !Number.isSafeInteger(numerator) ||
    !Number.isSafeInteger(denominator) ||
    numerator < 0 ||
    denominator <= 0 ||
    numerator > denominator
  ) {
    return null;
  }

  const denominatorBigInt = BigInt(denominator);
  const scaledHundredths = BigInt(numerator) * 10_000n;
  const roundedHundredths = (scaledHundredths * 2n + denominatorBigInt) / (denominatorBigInt * 2n);
  const whole = roundedHundredths / 100n;
  const fraction = roundedHundredths % 100n;
  if (fraction === 0n) return whole.toString();
  if (fraction % 10n === 0n) return `${whole}.${fraction / 10n}`;
  return `${whole}.${fraction.toString().padStart(2, '0')}`;
}

function isCoverageMicrobiologyGroup(value: unknown): value is CoverageMicrobiologyGroup {
  return COVERAGE_MICROBIOLOGY_GROUPS.includes(value as CoverageMicrobiologyGroup);
}

/**
 * Defensive wire validation. Angular still displays the values supplied by the
 * API, but rejects a response when count, denominator and proportion do not
 * describe the same population.
 */
export function validateCoverageMetricContract(
  result: CoverageMetricResponse,
): ScientificChartContractIssue[] {
  const issues = validateScientificResultIdentity(result);
  const traceIdentity = {
    datasetReleaseId: result.datasetReleaseId,
    metricId: result.metricId,
    metricVersion: result.metricVersion,
    chartId: 'H11',
    chartVersion: 'V1',
    resultSetId: result.resultSetId,
    filtersApplied: result.filtersApplied,
  } as const;

  if (result.metricId !== COVERAGE_METRIC_ID || result.metricVersion !== COVERAGE_METRIC_VERSION) {
    issues.push({
      code: 'COVERAGE_METRIC_ID_INVALID',
      message: `La respuesta debe corresponder a ${COVERAGE_METRIC_ID}:${COVERAGE_METRIC_VERSION}.`,
    });
  }

  if (
    result.numeratorDefinition !== COVERAGE_NUMERATOR_DEFINITION_V1 ||
    result.denominatorDefinition !== COVERAGE_DENOMINATOR_DEFINITION_V1
  ) {
    issues.push({
      code: 'COVERAGE_POPULATION_DEFINITION_MISMATCH',
      message:
        'Numerador y denominador deben coincidir con las definiciones versionadas de H11 V1.',
    });
  }

  const rootCoverageMatches =
    result.eligibleN === 0
      ? result.n === 0 && result.coverage === null
      : result.coverage !== null && nearlyEqual(result.coverage, result.n / result.eligibleN);
  if (
    result.numerator !== result.n ||
    result.denominator !== result.eligibleN ||
    !rootCoverageMatches
  ) {
    issues.push({
      code: 'COVERAGE_ROOT_POPULATION_MISMATCH',
      message: 'La población raíz, el numerador, el denominador y la cobertura no concilian.',
    });
  }

  const expectedCoverageDisplay =
    result.denominator === 0
      ? null
      : formatCoveragePercentageV1(result.numerator, result.denominator);
  if (
    (expectedCoverageDisplay === null && result.coverageDisplay !== null) ||
    (expectedCoverageDisplay !== null && result.coverageDisplay !== `${expectedCoverageDisplay} %`)
  ) {
    issues.push({
      code: 'COVERAGE_ROOT_DISPLAY_MISMATCH',
      message: 'coverageDisplay no coincide con el numerador y denominador H11 V1.',
    });
  }

  if (
    result.dimensionLabel !== COVERAGE_DIMENSION_LABEL_V1 ||
    result.stateDimensionLabel !== COVERAGE_STATE_DIMENSION_LABEL_V1
  ) {
    issues.push({
      code: 'COVERAGE_DIMENSION_CONTRACT_MISMATCH',
      message: 'Las dimensiones deben coincidir exactamente con el contrato visual H11 V1.',
    });
  }

  const axisMin = result.valueAxis?.min;
  const axisMax = result.valueAxis?.max;
  if (
    result.valueAxis?.field !== COVERAGE_VALUE_AXIS_V1.field ||
    result.valueAxis?.title !== COVERAGE_VALUE_AXIS_V1.title ||
    result.valueAxis?.unit !== COVERAGE_VALUE_AXIS_V1.unit ||
    result.valueAxis?.scale !== COVERAGE_VALUE_AXIS_V1.scale ||
    typeof axisMin !== 'number' ||
    typeof axisMax !== 'number' ||
    !Number.isFinite(axisMin) ||
    !Number.isFinite(axisMax) ||
    axisMin !== COVERAGE_VALUE_AXIS_V1.min ||
    axisMax !== COVERAGE_VALUE_AXIS_V1.max ||
    result.valueAxis?.transformNote !== COVERAGE_VALUE_AXIS_V1.transformNote ||
    result.unit !== '%'
  ) {
    issues.push({
      code: 'COVERAGE_AXIS_INVALID',
      message: 'El eje debe coincidir exactamente con el contrato visual H11 V1.',
    });
  }

  const ticksMatch =
    result.valueTicks.length === COVERAGE_VALUE_TICKS_V1.length &&
    result.valueTicks.every((tick, index) => {
      const expectedTick = COVERAGE_VALUE_TICKS_V1[index];
      return tick.value === expectedTick.value && tick.label === expectedTick.label;
    });
  if (!ticksMatch) {
    issues.push({
      code: 'COVERAGE_AXIS_TICK_INVALID',
      message: 'Los cinco ticks deben coincidir en valor, etiqueta y orden con H11 V1.',
    });
  }

  const stateIds = new Set<string>();
  for (const [stateIndex, state] of result.states.entries()) {
    if (!state.id?.trim() || stateIds.has(state.id)) {
      issues.push({
        code: 'COVERAGE_STATE_ID_INVALID',
        message: 'Cada estado de cobertura requiere un id único.',
      });
    }
    stateIds.add(state.id);
    if (
      !state.label?.trim() ||
      !state.description?.trim() ||
      !state.symbol?.trim() ||
      !COVERAGE_COLOR_TOKENS.includes(state.colorToken)
    ) {
      issues.push({
        code: 'COVERAGE_STATE_METADATA_INVALID',
        message: `El estado ${state.id || 'sin id'} no tiene metadatos visuales válidos.`,
      });
    }

    const expectedState = COVERAGE_RAW_STATE_SPECS_V1[stateIndex];
    if (
      !expectedState ||
      state.id !== expectedState.id ||
      state.label !== expectedState.label ||
      state.description !== expectedState.description ||
      state.colorToken !== expectedState.colorToken ||
      state.symbol !== expectedState.symbol ||
      state.order !== expectedState.order
    ) {
      issues.push({
        code: 'COVERAGE_STATE_CONTRACT_MISMATCH',
        message: `El estado en posición ${stateIndex + 1} no coincide con H11 V1.`,
      });
    }
  }
  if (result.states.length !== COVERAGE_RAW_STATE_SPECS_V1.length) {
    issues.push({
      code: 'COVERAGE_STATE_CONTRACT_MISMATCH',
      message: 'H11 V1 exige exactamente siete estados raw en orden canónico.',
    });
  }

  if (
    ['approved_current', 'provisional_descriptive'].includes(result.approvalStatus) &&
    (!result.states.length || !result.rows.length)
  ) {
    issues.push({
      code: 'COVERAGE_APPROVED_POPULATION_EMPTY',
      message: 'Un resultado visible debe contener estados y filas.',
    });
  }

  const filtersApplied = result.filtersApplied ?? {};
  const hasGroupFilter = Object.prototype.hasOwnProperty.call(filtersApplied, 'group');
  const appliedGroup = filtersApplied['group'];
  let expectedGroups: readonly CoverageMicrobiologyGroup[] = COVERAGE_MICROBIOLOGY_GROUPS;
  if (hasGroupFilter) {
    if (typeof appliedGroup === 'string' && isCoverageMicrobiologyGroup(appliedGroup)) {
      expectedGroups = [appliedGroup];
    } else {
      issues.push({
        code: 'COVERAGE_GROUP_FILTER_INVALID',
        message: 'El filtro group debe contener exactamente un código BSR, BPA, BHT o BAnT.',
      });
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
      issues.push({
        code: 'COVERAGE_TANK_FILTER_INVALID',
        message: 'El filtro tank debe contener un único identificador canónico.',
      });
    } else if (appliedTank !== 'ALL') {
      expectedTank = appliedTank;
    }
  }

  const rowIds = new Set<string>();
  const pointIds = new Set<string>();
  const tanks = new Set<string>();
  const tankGroupKeys = new Set<string>();
  const denominatorsByTank = new Map<string, Set<number>>();
  for (const row of result.rows) {
    if (!row.rowId?.trim() || rowIds.has(row.rowId) || !row.label?.trim()) {
      issues.push({
        code: 'COVERAGE_ROW_ID_INVALID',
        message: 'Cada fila de cobertura requiere id y etiqueta únicos.',
      });
    }
    rowIds.add(row.rowId);

    const canonicalTank =
      typeof row.tank === 'string' && row.tank === row.tank.trim() && row.tank.length > 0;
    const canonicalGroup = isCoverageMicrobiologyGroup(row.group);
    if (!canonicalTank || !canonicalGroup) {
      issues.push({
        code: 'COVERAGE_ROW_DIMENSION_INVALID',
        message: `La fila ${row.rowId || 'sin id'} requiere tanque y grupo microbiológico canónicos.`,
      });
    } else {
      const tankGroupKey = `${row.tank}\u0000${row.group}`;
      if (row.label !== `${row.tank} · ${row.group}`) {
        issues.push({
          code: 'COVERAGE_ROW_LABEL_MISMATCH',
          message: `La etiqueta visible de ${row.rowId} contradice sus dimensiones estructuradas.`,
        });
      }
      if (tankGroupKeys.has(tankGroupKey)) {
        issues.push({
          code: 'COVERAGE_ROW_DIMENSION_DUPLICATE',
          message: `La combinación ${row.tank} × ${row.group} aparece más de una vez.`,
        });
      }
      tankGroupKeys.add(tankGroupKey);
      tanks.add(row.tank);
      if (expectedTank !== null && row.tank !== expectedTank) {
        issues.push({
          code: 'COVERAGE_TANK_FILTER_MISMATCH',
          message: `La fila ${row.rowId} pertenece a ${row.tank}, no al tanque solicitado ${expectedTank}.`,
        });
      }
      if (!expectedGroups.includes(row.group)) {
        issues.push({
          code: 'COVERAGE_GROUP_FILTER_MISMATCH',
          message: `La fila ${row.rowId} contiene ${row.group}, fuera de los grupos solicitados.`,
        });
      }
    }

    const cellStateIds = new Set<string>();
    let rowDenominator: number | null = null;
    let rowCountTotal = 0;
    let rowProportionTotal = 0;
    for (const cell of row.cells) {
      if (
        !cell.pointId?.trim() ||
        pointIds.has(cell.pointId) ||
        cell.rowId !== row.rowId ||
        !stateIds.has(cell.stateId) ||
        cellStateIds.has(cell.stateId)
      ) {
        issues.push({
          code: 'COVERAGE_CELL_IDENTITY_INVALID',
          message: `Una celda de ${row.rowId || 'fila sin id'} no concilia con fila/estado/punto.`,
        });
      }
      pointIds.add(cell.pointId);
      cellStateIds.add(cell.stateId);

      if (
        !Number.isSafeInteger(cell.count) ||
        !Number.isSafeInteger(cell.denominator) ||
        cell.count < 0 ||
        cell.denominator <= 0 ||
        cell.count > cell.denominator
      ) {
        issues.push({
          code: 'COVERAGE_CELL_COUNTS_INVALID',
          message: `Los conteos de ${cell.pointId || 'la celda'} no son válidos.`,
        });
      }

      if (rowDenominator === null) rowDenominator = cell.denominator;
      if (canonicalTank && Number.isInteger(cell.denominator) && cell.denominator > 0) {
        const tankDenominators = denominatorsByTank.get(row.tank) ?? new Set<number>();
        tankDenominators.add(cell.denominator);
        denominatorsByTank.set(row.tank, tankDenominators);
      }
      rowCountTotal += cell.count;
      rowProportionTotal += cell.proportion;
      if (
        rowDenominator !== cell.denominator ||
        cell.denominator <= 0 ||
        !nearlyEqual(cell.proportion, cell.count / cell.denominator)
      ) {
        issues.push({
          code: 'COVERAGE_CELL_FRACTION_MISMATCH',
          message: `Conteo, denominador y proporción de ${cell.pointId || 'la celda'} no concilian.`,
        });
      }

      if (
        !Number.isFinite(cell.proportion) ||
        (typeof axisMin === 'number' && cell.proportion < axisMin) ||
        (typeof axisMax === 'number' && cell.proportion > axisMax)
      ) {
        issues.push({
          code: 'COVERAGE_CELL_DISPLAY_INVALID',
          message: `La proporción publicada de ${cell.pointId || 'la celda'} no es representable.`,
        });
      }

      const expectedCellPercentage = formatCoveragePercentageV1(cell.count, cell.denominator);
      if (
        expectedCellPercentage === null ||
        cell.displayValue !== `${expectedCellPercentage} % (${cell.count}/${cell.denominator})`
      ) {
        issues.push({
          code: 'COVERAGE_CELL_DISPLAY_MISMATCH',
          message: `El texto visible de ${cell.pointId || 'la celda'} contradice su fracción H11 V1.`,
        });
      }

      if (
        !cell.traceToken?.trim() ||
        !cell.traceEndpoint?.trim() ||
        cell.traceResultSetId !== result.resultSetId ||
        cell.tracePointId !== cell.pointId ||
        !Number.isInteger(cell.sourceCellCount) ||
        cell.sourceCellCount < 0 ||
        cell.lineagePreview.length > MAX_COVERAGE_LINEAGE_PREVIEW_CELLS ||
        cell.lineagePreview.length > cell.sourceCellCount ||
        (cell.sourceCellCount === 0 && cell.lineagePreview.length !== 0) ||
        (cell.count === 0) !== (cell.sourceCellCount === 0) ||
        (cell.count > 0 && cell.sourceCellCount < cell.count)
      ) {
        issues.push({
          code: 'COVERAGE_CELL_LINEAGE_MISSING',
          message: `La celda ${cell.pointId || 'sin id'} no tiene una referencia de trazabilidad acotada.`,
        });
      }
      appendAnalyticalTraceIssues(issues, cell.traceEndpoint, traceIdentity, {
        pointId: cell.pointId,
        traceToken: cell.traceToken,
      });
    }

    if (stateIds.size !== cellStateIds.size || [...stateIds].some((id) => !cellStateIds.has(id))) {
      issues.push({
        code: 'COVERAGE_MATRIX_INCOMPLETE',
        message: `La fila ${row.rowId || 'sin id'} no contiene la matriz completa de estados.`,
      });
    }

    if (
      rowDenominator === null ||
      rowCountTotal !== rowDenominator ||
      !nearlyEqual(rowProportionTotal, 1)
    ) {
      issues.push({
        code: 'COVERAGE_ROW_POPULATION_MISMATCH',
        message: `Los estados de ${row.rowId || 'la fila'} no forman una partición completa del mismo denominador.`,
      });
    }
  }

  const missingTankGroups: string[] = [];
  for (const tank of tanks) {
    for (const group of expectedGroups) {
      if (!tankGroupKeys.has(`${tank}\u0000${group}`)) {
        missingTankGroups.push(`${tank} × ${group}`);
      }
    }
  }
  if (missingTankGroups.length) {
    issues.push({
      code: 'COVERAGE_TANK_GROUP_MATRIX_INCOMPLETE',
      message: `Faltan filas de la matriz tanque × grupo: ${missingTankGroups.slice(0, 10).join(', ')}.`,
    });
  }

  let tankDenominatorTotal = 0;
  let everyTankHasOneDenominator = true;
  for (const tank of tanks) {
    const denominators = denominatorsByTank.get(tank) ?? new Set<number>();
    if (denominators.size !== 1) {
      everyTankHasOneDenominator = false;
      issues.push({
        code: 'COVERAGE_TANK_DENOMINATOR_MISMATCH',
        message: `Todas las filas de ${tank} deben compartir un único denominador elegible.`,
      });
      continue;
    }
    tankDenominatorTotal += [...denominators][0];
  }

  if (!everyTankHasOneDenominator || tankDenominatorTotal !== result.eligibleN) {
    issues.push({
      code: 'COVERAGE_ROOT_ELIGIBLE_MISMATCH',
      message: 'La suma de un único denominador por tanque no coincide con eligibleN raíz.',
    });
  }

  return issues;
}
