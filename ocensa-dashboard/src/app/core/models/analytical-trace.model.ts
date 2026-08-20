import type {
  ScientificChartContractIssue,
  ScientificResultIdentity,
} from './scientific-chart.model';

export const ANALYTICAL_TRACE_ROUTE_V1 = '/api/v1/analytics/traces/V1' as const;
export const ANALYTICAL_TRACE_PAGE_V1 = 1 as const;
export const ANALYTICAL_TRACE_PAGE_SIZE_V1 = 50 as const;
export const ANALYTICAL_TRACE_MAX_PAGE_V1 = 200 as const;

const TRACE_ORIGIN = 'https://trace.ocensa.invalid';
const MAX_TRACE_ENDPOINT_LENGTH = 8_192;
const REQUIRED_SINGLE_QUERY_KEYS = [
  'datasetReleaseId',
  'metricId',
  'metricVersion',
  'chartId',
  'chartVersion',
  'resultSetId',
  'pointId',
  'traceToken',
  'page',
  'pageSize',
] as const;
const FILTER_QUERY_NAME = {
  tank: 'tank',
  from: 'from',
  to: 'to',
  source: 'source',
  drain: 'drain',
  group: 'group',
  year: 'years',
  month: 'months',
  method: 'method',
} as const;
const ALLOWED_QUERY_KEYS = new Set<string>([
  ...REQUIRED_SINGLE_QUERY_KEYS,
  ...Object.values(FILTER_QUERY_NAME),
]);

export interface AnalyticalTraceIdentity {
  datasetReleaseId: string;
  metricId: string;
  metricVersion: string;
  chartId: string;
  chartVersion: string;
  resultSetId: string;
  filtersApplied: ScientificResultIdentity['filtersApplied'];
}

export interface AnalyticalTraceTarget {
  pointId: string;
  traceToken: string;
}

export type AnalyticalTraceCellStatus =
  | 'missing'
  | 'reported_zero'
  | 'not_detected'
  | 'censored'
  | 'numeric'
  | 'text'
  | 'date'
  | 'boolean'
  | 'invalid';

export interface AnalyticalTraceCell {
  sourceCellId: string;
  sheet: string;
  address: string;
  sourceRowNumber: number;
  sourceColumnNumber: number;
  headerText: string | null;
  headerSha256: string | null;
  status: AnalyticalTraceCellStatus;
  qualifier: string | null;
  unit: string | null;
  parseRuleId: string;
  cellDataType: string;
  warning: string | null;
  lineageSha256: string;
}

export interface AnalyticalTraceResponse {
  contractVersion: 'TRACE.V1';
  datasetReleaseId: string;
  importBatchId: string;
  metricId: string;
  metricVersion: string;
  chartId: string;
  chartVersion: string;
  resultSetId: string;
  pointId: string;
  traceToken: string;
  page: number;
  pageSize: typeof ANALYTICAL_TRACE_PAGE_SIZE_V1;
  totalCells: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
  cells: AnalyticalTraceCell[];
  warnings: string[];
}

export interface AnalyticalTraceResponseValidation {
  response: AnalyticalTraceResponse | null;
  issues: ScientificChartContractIssue[];
}

interface ParsedTraceEndpoint {
  params: URLSearchParams;
  keys: string[];
}

function parseInternalTraceEndpoint(endpoint: unknown): ParsedTraceEndpoint | null {
  if (
    typeof endpoint !== 'string' ||
    endpoint.length === 0 ||
    endpoint.length > MAX_TRACE_ENDPOINT_LENGTH ||
    endpoint !== endpoint.trim() ||
    !endpoint.startsWith(`${ANALYTICAL_TRACE_ROUTE_V1}?`) ||
    endpoint.includes('#') ||
    endpoint.includes('+') ||
    /[\u0000-\u0020\u007f\\]/.test(endpoint) ||
    /%(?![0-9a-fA-F]{2})/.test(endpoint) ||
    endpoint.indexOf('?') !== endpoint.lastIndexOf('?')
  ) {
    return null;
  }

  const query = endpoint.slice(endpoint.indexOf('?') + 1);
  const rawPairs = query.split('&');
  if (!rawPairs.length || rawPairs.some((pair) => !pair || !pair.includes('='))) return null;

  let url: URL;
  try {
    url = new URL(endpoint, TRACE_ORIGIN);
  } catch {
    return null;
  }

  if (
    url.origin !== TRACE_ORIGIN ||
    url.pathname !== ANALYTICAL_TRACE_ROUTE_V1 ||
    url.hash ||
    !url.search
  ) {
    return null;
  }

  const keys: string[] = [];
  for (const pair of rawPairs) {
    const rawKey = pair.slice(0, pair.indexOf('='));
    if (!/^[A-Za-z]+$/.test(rawKey)) return null;
    keys.push(rawKey);
  }

  const entries = [...url.searchParams.entries()];
  if (
    entries.length !== rawPairs.length ||
    entries.some(([key, value]) => !ALLOWED_QUERY_KEYS.has(key) || !value)
  ) {
    return null;
  }

  for (const key of REQUIRED_SINGLE_QUERY_KEYS) {
    if (url.searchParams.getAll(key).length !== 1) return null;
  }
  for (const key of ALLOWED_QUERY_KEYS) {
    if (key !== 'years' && key !== 'months' && url.searchParams.getAll(key).length > 1) {
      return null;
    }
  }

  if (
    url.searchParams.get('page') !== String(ANALYTICAL_TRACE_PAGE_V1) ||
    url.searchParams.get('pageSize') !== String(ANALYTICAL_TRACE_PAGE_SIZE_V1)
  ) {
    return null;
  }

  return { params: url.searchParams, keys };
}

function canonicalAppliedFilters(
  filters: ScientificResultIdentity['filtersApplied'],
): Map<string, string[]> | null {
  if (!filters || typeof filters !== 'object' || Array.isArray(filters)) return null;

  const canonical = new Map<string, string[]>();
  for (const [name, rawValue] of Object.entries(filters)) {
    const queryName = FILTER_QUERY_NAME[name as keyof typeof FILTER_QUERY_NAME];
    if (!queryName) return null;

    const values = Array.isArray(rawValue) ? rawValue : [rawValue];
    if (!values.length || values.length > 100) return null;
    const normalized: string[] = [];
    for (const value of values) {
      if (typeof value !== 'string' || !value || value !== value.trim()) return null;
      if (name === 'year' || name === 'month') {
        const numeric = Number(value);
        const min = name === 'year' ? 1900 : 1;
        const max = name === 'year' ? 9999 : 12;
        if (
          !Number.isInteger(numeric) ||
          numeric < min ||
          numeric > max ||
          String(numeric) !== value
        ) {
          return null;
        }
      }
      normalized.push(value);
    }
    if (new Set(normalized).size !== normalized.length) return null;
    canonical.set(
      queryName,
      normalized.sort((left, right) => left.localeCompare(right, 'en')),
    );
  }

  return canonical;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasExactKeys(record: Record<string, unknown>, expected: readonly string[]): boolean {
  const actual = Object.keys(record).sort();
  const canonical = [...expected].sort();
  return (
    actual.length === canonical.length && actual.every((key, index) => key === canonical[index])
  );
}

function isCanonicalSha256(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);
}

function isBoundedText(value: unknown, maximum = 512): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= maximum &&
    value === value.trim() &&
    !/[\u0000-\u001f\u007f]/.test(value)
  );
}

function isNullableBoundedText(value: unknown, maximum = 512): value is string | null {
  return value === null || isBoundedText(value, maximum);
}

function isHeaderText(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 512 && !/[\u0000-\u001f\u007f]/.test(value);
}

function spreadsheetColumnNumber(column: string): number {
  let value = 0;
  for (const character of column) value = value * 26 + character.charCodeAt(0) - 64;
  return value;
}

function containsForbiddenTraceField(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsForbiddenTraceField);
  if (!isRecord(value)) return false;

  return Object.entries(value).some(
    ([key, nested]) =>
      /^(?:raw(?:text|value)?|numeric(?:value)?|formula(?:a1)?|(?:sample)?date)$/i.test(key) ||
      containsForbiddenTraceField(nested),
  );
}

function invalidTraceResponse(code: string, message: string): AnalyticalTraceResponseValidation {
  return { response: null, issues: [{ code, message }] };
}

/**
 * Structural defense used at the final rendering boundary. Scientific response
 * validators additionally bind every query value to its exact result and point.
 */
export function isInternalAnalyticalTraceEndpoint(endpoint: unknown): endpoint is string {
  return parseInternalTraceEndpoint(endpoint) !== null;
}

/** Derives only the bounded page number from the immutable server-authored URL. */
export function deriveAnalyticalTracePageEndpoint(endpoint: unknown, page: number): string | null {
  if (
    typeof endpoint !== 'string' ||
    !parseInternalTraceEndpoint(endpoint) ||
    !Number.isSafeInteger(page) ||
    page < 1 ||
    page > ANALYTICAL_TRACE_MAX_PAGE_V1
  ) {
    return null;
  }

  return endpoint.replace(
    /([?&]page=)1(?=&|$)/,
    (_match: string, prefix: string) => `${prefix}${page}`,
  );
}

/**
 * Validates a fetched TRACE.V1 page before any metadata reaches the DOM. The
 * response may contain only the explicit metadata allowlist; raw, numeric,
 * formula or date fields are rejected recursively.
 */
export function validateAnalyticalTraceResponse(
  wire: unknown,
  sourceEndpoint: unknown,
  requestedPage: number,
): AnalyticalTraceResponseValidation {
  const parsed = parseInternalTraceEndpoint(sourceEndpoint);
  if (
    !parsed ||
    !Number.isSafeInteger(requestedPage) ||
    requestedPage < 1 ||
    requestedPage > ANALYTICAL_TRACE_MAX_PAGE_V1
  ) {
    return invalidTraceResponse(
      'TRACE_REQUEST_IDENTITY_INVALID',
      'La solicitud de trazabilidad no conserva una referencia V1 válida.',
    );
  }
  if (containsForbiddenTraceField(wire)) {
    return invalidTraceResponse(
      'TRACE_FORBIDDEN_FIELD_PRESENT',
      'La respuesta contiene campos de valor que el visor no está autorizado a aceptar.',
    );
  }
  if (!isRecord(wire)) {
    return invalidTraceResponse(
      'TRACE_RESPONSE_SHAPE_INVALID',
      'La respuesta TRACE.V1 no es un objeto.',
    );
  }

  const rootKeys = [
    'contractVersion',
    'datasetReleaseId',
    'importBatchId',
    'metricId',
    'metricVersion',
    'chartId',
    'chartVersion',
    'resultSetId',
    'pointId',
    'traceToken',
    'page',
    'pageSize',
    'totalCells',
    'totalPages',
    'hasPreviousPage',
    'hasNextPage',
    'cells',
    'warnings',
  ] as const;
  if (!hasExactKeys(wire, rootKeys)) {
    return invalidTraceResponse(
      'TRACE_RESPONSE_SHAPE_INVALID',
      'La respuesta TRACE.V1 contiene campos omitidos o no autorizados.',
    );
  }

  const expectedIdentity = {
    contractVersion: 'TRACE.V1',
    datasetReleaseId: parsed.params.get('datasetReleaseId'),
    metricId: parsed.params.get('metricId'),
    metricVersion: parsed.params.get('metricVersion'),
    chartId: parsed.params.get('chartId'),
    chartVersion: parsed.params.get('chartVersion'),
    resultSetId: parsed.params.get('resultSetId'),
    pointId: parsed.params.get('pointId'),
    traceToken: parsed.params.get('traceToken'),
  } as const;
  if (
    Object.entries(expectedIdentity).some(([key, value]) => wire[key] !== value) ||
    !isCanonicalSha256(wire['importBatchId'])
  ) {
    return invalidTraceResponse(
      'TRACE_RESPONSE_IDENTITY_MISMATCH',
      'La respuesta no pertenece al release, ResultSet, punto y token solicitados.',
    );
  }

  const page = wire['page'];
  const pageSize = wire['pageSize'];
  const totalCells = wire['totalCells'];
  const totalPages = wire['totalPages'];
  const hasPreviousPage = wire['hasPreviousPage'];
  const hasNextPage = wire['hasNextPage'];
  const cells = wire['cells'];
  const warnings = wire['warnings'];
  if (
    page !== requestedPage ||
    pageSize !== ANALYTICAL_TRACE_PAGE_SIZE_V1 ||
    !Number.isSafeInteger(totalCells) ||
    (totalCells as number) < 0 ||
    (totalCells as number) > 10_000 ||
    !Number.isSafeInteger(totalPages) ||
    (totalPages as number) !==
      ((totalCells as number) === 0
        ? 0
        : Math.ceil((totalCells as number) / ANALYTICAL_TRACE_PAGE_SIZE_V1)) ||
    ((totalPages as number) === 0 ? requestedPage !== 1 : requestedPage > (totalPages as number)) ||
    hasPreviousPage !== (requestedPage > 1 && (totalCells as number) > 0) ||
    hasNextPage !== ((totalPages as number) > 0 && requestedPage < (totalPages as number)) ||
    !Array.isArray(cells) ||
    cells.length !==
      ((totalCells as number) === 0
        ? 0
        : Math.min(
            ANALYTICAL_TRACE_PAGE_SIZE_V1,
            (totalCells as number) - (requestedPage - 1) * ANALYTICAL_TRACE_PAGE_SIZE_V1,
          )) ||
    !Array.isArray(warnings) ||
    warnings.length !== 2 ||
    warnings[0] !== 'raw_values_not_exposed' ||
    warnings[1] !== 'exact_release_recalculated_no_latest'
  ) {
    return invalidTraceResponse(
      'TRACE_RESPONSE_PAGINATION_INVALID',
      'La página, los totales o las advertencias TRACE.V1 no concilian.',
    );
  }

  const cellKeys = [
    'sourceCellId',
    'sheet',
    'address',
    'sourceRowNumber',
    'sourceColumnNumber',
    'headerText',
    'headerSha256',
    'status',
    'qualifier',
    'unit',
    'parseRuleId',
    'cellDataType',
    'warning',
    'lineageSha256',
  ] as const;
  const allowedStatuses = new Set<AnalyticalTraceCellStatus>([
    'missing',
    'reported_zero',
    'not_detected',
    'censored',
    'numeric',
    'text',
    'date',
    'boolean',
    'invalid',
  ]);
  const seenSourceCellIds = new Set<string>();
  for (const candidate of cells) {
    if (!isRecord(candidate) || !hasExactKeys(candidate, cellKeys)) {
      return invalidTraceResponse(
        'TRACE_CELL_SHAPE_INVALID',
        'Una celda de trazabilidad contiene campos omitidos o no autorizados.',
      );
    }
    const address = candidate['address'];
    const addressMatch = typeof address === 'string' ? /^([A-Z]+)([1-9]\d*)$/.exec(address) : null;
    const sourceCellId = candidate['sourceCellId'];
    const sheet = candidate['sheet'];
    const row = candidate['sourceRowNumber'];
    const column = candidate['sourceColumnNumber'];
    if (
      !isBoundedText(sourceCellId, 384) ||
      seenSourceCellIds.has(sourceCellId) ||
      !isBoundedText(sheet, 255) ||
      sheet.includes('!') ||
      !addressMatch ||
      sourceCellId !== `${sheet}!${address}` ||
      !Number.isSafeInteger(row) ||
      row !== Number(addressMatch[2]) ||
      !Number.isSafeInteger(column) ||
      column !== spreadsheetColumnNumber(addressMatch[1]) ||
      !(
        (candidate['headerText'] === null && candidate['headerSha256'] === null) ||
        (isHeaderText(candidate['headerText']) && isCanonicalSha256(candidate['headerSha256']))
      ) ||
      !allowedStatuses.has(candidate['status'] as AnalyticalTraceCellStatus) ||
      !isNullableBoundedText(candidate['qualifier'], 128) ||
      !isNullableBoundedText(candidate['unit'], 128) ||
      !isBoundedText(candidate['parseRuleId'], 128) ||
      !isBoundedText(candidate['cellDataType'], 32) ||
      !isNullableBoundedText(candidate['warning'], 512) ||
      !isCanonicalSha256(candidate['lineageSha256'])
    ) {
      return invalidTraceResponse(
        'TRACE_CELL_METADATA_INVALID',
        'Una celda de trazabilidad no conserva coordenada, clasificación o huella canónica.',
      );
    }
    seenSourceCellIds.add(sourceCellId);
  }

  return { response: wire as unknown as AnalyticalTraceResponse, issues: [] };
}

/**
 * Verifies the server-authored trace URL without constructing or repairing it in Angular.
 * Any mismatch removes the entire analytical response from the renderable state.
 */
export function validateAnalyticalTraceEndpoint(
  endpoint: unknown,
  identity: AnalyticalTraceIdentity,
  target: AnalyticalTraceTarget,
): ScientificChartContractIssue[] {
  const parsed = parseInternalTraceEndpoint(endpoint);
  const expectedFilters = canonicalAppliedFilters(identity.filtersApplied);
  if (!parsed || !expectedFilters) {
    return [
      {
        code: 'ANALYTICAL_TRACE_ENDPOINT_INVALID',
        message: 'La traza no es una URL interna V1 con filtros canónicos.',
      },
    ];
  }

  const expectedSingles: Readonly<Record<string, string>> = {
    datasetReleaseId: identity.datasetReleaseId,
    metricId: identity.metricId,
    metricVersion: identity.metricVersion,
    chartId: identity.chartId,
    chartVersion: identity.chartVersion,
    resultSetId: identity.resultSetId,
    pointId: target.pointId,
    traceToken: target.traceToken,
    page: String(ANALYTICAL_TRACE_PAGE_V1),
    pageSize: String(ANALYTICAL_TRACE_PAGE_SIZE_V1),
  };

  if (
    Object.values(expectedSingles).some(
      (value) => typeof value !== 'string' || !value || value !== value.trim(),
    ) ||
    Object.entries(expectedSingles).some(([key, value]) => parsed.params.get(key) !== value)
  ) {
    return [
      {
        code: 'ANALYTICAL_TRACE_IDENTITY_MISMATCH',
        message: 'La traza no pertenece al release, ResultSet, punto o token visible.',
      },
    ];
  }

  const expectedQueryKeys = new Set<string>([
    ...REQUIRED_SINGLE_QUERY_KEYS,
    ...expectedFilters.keys(),
  ]);
  if (parsed.keys.some((key) => !expectedQueryKeys.has(key))) {
    return [
      {
        code: 'ANALYTICAL_TRACE_FILTER_MISMATCH',
        message: 'La traza contiene dimensiones que no pertenecen a los filtros aplicados.',
      },
    ];
  }

  for (const [queryName, expectedValues] of expectedFilters) {
    const actualValues = parsed.params
      .getAll(queryName)
      .sort((left, right) => left.localeCompare(right, 'en'));
    if (
      actualValues.length !== expectedValues.length ||
      actualValues.some((value, index) => value !== expectedValues[index])
    ) {
      return [
        {
          code: 'ANALYTICAL_TRACE_FILTER_MISMATCH',
          message: 'La traza no reproduce exactamente los filtros aplicados al resultado.',
        },
      ];
    }
  }

  return [];
}

/** Adds at most one issue per trace failure class so a large matrix cannot hide other blockers. */
export function appendAnalyticalTraceIssues(
  issues: ScientificChartContractIssue[],
  endpoint: unknown,
  identity: AnalyticalTraceIdentity,
  target: AnalyticalTraceTarget,
): void {
  for (const traceIssue of validateAnalyticalTraceEndpoint(endpoint, identity, target)) {
    if (!issues.some((current) => current.code === traceIssue.code)) issues.push(traceIssue);
  }
}
