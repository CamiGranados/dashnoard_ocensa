import { describe, expect, it } from 'vitest';
import { analyticalTraceFixture } from '../../../testing/analytical-trace-fixture';
import {
  AnalyticalTraceCell,
  AnalyticalTraceResponse,
  deriveAnalyticalTracePageEndpoint,
  isInternalAnalyticalTraceEndpoint,
  validateAnalyticalTraceEndpoint,
  validateAnalyticalTraceResponse,
} from './analytical-trace.model';

const identity = {
  datasetReleaseId: 'release-1',
  metricId: 'THPS.DATA.COVERAGE.V1',
  metricVersion: 'V1',
  chartId: 'H11',
  chartVersion: 'V1',
  resultSetId: 'result-1',
  filtersApplied: { tank: 'TK7311', year: ['2025', '2026'], month: '5' },
};
const target = { pointId: 'point-1', traceToken: 'token-1' } as const;
const importBatchId = 'b'.repeat(64);
const headerSha256 = 'c'.repeat(64);
const lineageSha256 = 'd'.repeat(64);

function endpoint(): string {
  return analyticalTraceFixture({
    ...identity,
    pointId: target.pointId,
    traceToken: target.traceToken,
    filters: { tank: 'TK7311', year: ['2025', '2026'], month: '5' },
  });
}

function cell(row: number): AnalyticalTraceCell {
  return {
    sourceCellId: `Sheet1!A${row}`,
    sheet: 'Sheet1',
    address: `A${row}`,
    sourceRowNumber: row,
    sourceColumnNumber: 1,
    headerText: 'Tanque',
    headerSha256,
    status: 'text',
    qualifier: null,
    unit: null,
    parseRuleId: 'raw-classifier-v2:text',
    cellDataType: 'Text',
    warning: null,
    lineageSha256,
  };
}

function traceResponse(page: number, totalCells: number): AnalyticalTraceResponse {
  const totalPages = totalCells === 0 ? 0 : Math.ceil(totalCells / 50);
  const firstRow = (page - 1) * 50 + 1;
  const pageCount = totalCells === 0 ? 0 : Math.min(50, totalCells - firstRow + 1);
  return {
    contractVersion: 'TRACE.V1',
    datasetReleaseId: identity.datasetReleaseId,
    importBatchId,
    metricId: identity.metricId,
    metricVersion: identity.metricVersion,
    chartId: identity.chartId,
    chartVersion: identity.chartVersion,
    resultSetId: identity.resultSetId,
    pointId: target.pointId,
    traceToken: target.traceToken,
    page,
    pageSize: 50,
    totalCells,
    totalPages,
    hasPreviousPage: page > 1 && totalCells > 0,
    hasNextPage: totalPages > 0 && page < totalPages,
    cells: Array.from({ length: pageCount }, (_, index) => cell(firstRow + index)),
    warnings: ['raw_values_not_exposed', 'exact_release_recalculated_no_latest'],
  };
}

describe('analytical trace endpoint contract', () => {
  it('accepts only the exact internal V1 identity, pagination and repeated calendar filters', () => {
    const candidate = endpoint();
    expect(isInternalAnalyticalTraceEndpoint(candidate)).toBe(true);
    expect(validateAnalyticalTraceEndpoint(candidate, identity, target)).toEqual([]);
  });

  it.each([
    'javascript:alert(1)',
    'https://evil.example/trace',
    '//evil.example/trace',
    '/api/v1/analytics/traces/V1?pointId=point-1',
    `${endpoint()}&unknown=value`,
    `${endpoint()}&tank=TK7311`,
  ])('rejects external, malformed, unknown or duplicate query structure: %s', (candidate) => {
    expect(isInternalAnalyticalTraceEndpoint(candidate)).toBe(false);
  });

  it('rejects a missing expected filter and a cross-result identity', () => {
    const missingFilter = analyticalTraceFixture({
      ...identity,
      pointId: target.pointId,
      traceToken: target.traceToken,
      filters: { tank: 'TK7311', year: ['2025', '2026'] },
    });
    const crossResult = endpoint().replace('resultSetId=result-1', 'resultSetId=result-2');

    expect(
      validateAnalyticalTraceEndpoint(missingFilter, identity, target).map((item) => item.code),
    ).toContain('ANALYTICAL_TRACE_FILTER_MISMATCH');
    expect(
      validateAnalyticalTraceEndpoint(crossResult, identity, target).map((item) => item.code),
    ).toContain('ANALYTICAL_TRACE_IDENTITY_MISMATCH');
  });

  it('derives only page 2, 3 or 200 from the immutable page-1 endpoint', () => {
    const base = endpoint();
    expect(deriveAnalyticalTracePageEndpoint(base, 2)).toBe(base.replace('&page=1', '&page=2'));
    expect(deriveAnalyticalTracePageEndpoint(base, 3)).toBe(base.replace('&page=1', '&page=3'));
    expect(deriveAnalyticalTracePageEndpoint(base, 200)).toBe(base.replace('&page=1', '&page=200'));
    expect(deriveAnalyticalTracePageEndpoint(base, 0)).toBeNull();
    expect(deriveAnalyticalTracePageEndpoint(base, 201)).toBeNull();
    expect(deriveAnalyticalTracePageEndpoint(base.replace('&page=1', '&page=2'), 3)).toBeNull();
  });

  it('accepts exact TRACE.V1 page metadata while retaining the page-1 identity as its root', () => {
    expect(validateAnalyticalTraceResponse(traceResponse(1, 75), endpoint(), 1).issues).toEqual([]);
    expect(validateAnalyticalTraceResponse(traceResponse(2, 75), endpoint(), 2).issues).toEqual([]);
  });

  it('rejects cross-identity, corrupt pagination and forbidden value fields', () => {
    const crossIdentity = traceResponse(1, 1);
    crossIdentity.resultSetId = 'another-result';
    const corruptPage = traceResponse(1, 1);
    corruptPage.totalPages = 2;
    const forbidden = traceResponse(1, 1) as unknown as Record<string, unknown>;
    (forbidden['cells'] as Array<Record<string, unknown>>)[0]['rawValue'] = 'not-authorized';

    expect(validateAnalyticalTraceResponse(crossIdentity, endpoint(), 1).issues[0]?.code).toBe(
      'TRACE_RESPONSE_IDENTITY_MISMATCH',
    );
    expect(validateAnalyticalTraceResponse(corruptPage, endpoint(), 1).issues[0]?.code).toBe(
      'TRACE_RESPONSE_PAGINATION_INVALID',
    );
    expect(validateAnalyticalTraceResponse(forbidden, endpoint(), 1).issues[0]?.code).toBe(
      'TRACE_FORBIDDEN_FIELD_PRESENT',
    );
  });

  it('requires a canonical import hash and an exact nullable header/hash pair', () => {
    const badBatch = traceResponse(1, 1);
    badBatch.importBatchId = 'batch-1';
    const orphanHeaderHash = traceResponse(1, 1);
    orphanHeaderHash.cells[0].headerText = null;
    const missingHeaderHash = traceResponse(1, 1);
    missingHeaderHash.cells[0].headerSha256 = null;

    expect(validateAnalyticalTraceResponse(badBatch, endpoint(), 1).issues[0]?.code).toBe(
      'TRACE_RESPONSE_IDENTITY_MISMATCH',
    );
    expect(validateAnalyticalTraceResponse(orphanHeaderHash, endpoint(), 1).issues[0]?.code).toBe(
      'TRACE_CELL_METADATA_INVALID',
    );
    expect(validateAnalyticalTraceResponse(missingHeaderHash, endpoint(), 1).issues[0]?.code).toBe(
      'TRACE_CELL_METADATA_INVALID',
    );
  });
});
