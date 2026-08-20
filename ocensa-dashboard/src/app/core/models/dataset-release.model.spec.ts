import { describe, expect, it, vi } from 'vitest';
import {
  MAX_IMPORT_BATCH_BYTES,
  DatasetReleaseMetadataResponse,
  formatScientificValue,
  scientificValueForChart,
  validateApprovedUatMetadata,
  validateImportSelection,
} from './dataset-release.model';

function metadataFile(name: string, size: number): File {
  return {
    name,
    size,
    lastModified: 1,
    arrayBuffer: vi.fn(),
  } as unknown as File;
}

const releaseIdentity = 'a'.repeat(64);
const approvedMetadata: DatasetReleaseMetadataResponse = {
  releaseIdentity,
  importBatchId: 'b'.repeat(64),
  fileSha256: 'c'.repeat(64),
  schemaVersion: 'thps-raw-v1',
  classifierVersion: 'raw-cell-classifier-v1',
  state: 'approved',
  isPublished: false,
  approvedBy: 'development-analytics-cli',
  approvedAtUtc: '2026-08-20T12:00:00Z',
  createdAtUtc: '2026-08-20T11:00:00Z',
  declaredSheetCount: 1,
  storedSheetCount: 1,
  declaredCellCount: 10,
  storedRawCellCount: 10,
  analyticsReadEnabled: true,
  allowedMetricIds: ['THPS.DATA.COVERAGE.V1'],
  allowedChartIds: ['H08'],
};

describe('dataset release display contract', () => {
  it('accepts one xlsx at the exact 25 MiB boundary without reading bytes', () => {
    const file = metadataFile('dataset.xlsx', MAX_IMPORT_BATCH_BYTES);

    expect(validateImportSelection([file])).toEqual({
      valid: true,
      errors: [],
      totalBytes: MAX_IMPORT_BATCH_BYTES,
    });
    expect(file.arrayBuffer).not.toHaveBeenCalled();
  });

  it('rejects before upload when the file is over 25 MiB', () => {
    const file = metadataFile('dataset.xlsx', MAX_IMPORT_BATCH_BYTES + 1);
    const result = validateImportSelection([file]);

    expect(result.valid).toBe(false);
    expect(result.errors.join(' ')).toContain('25 MiB');
    expect(file.arrayBuffer).not.toHaveBeenCalled();
  });

  it('requires exactly one xlsx', () => {
    const first = metadataFile('a.xlsx', 10);
    const second = metadataFile('b.xlsx', 10);

    expect(validateImportSelection([first, second]).valid).toBe(false);
    expect(validateImportSelection([metadataFile('a.xls', 10)]).valid).toBe(false);
  });

  it('keeps missing, reported zero and censored values distinct', () => {
    expect(formatScientificValue({ value: null, status: 'missing' })).toBe('—');
    expect(formatScientificValue({ value: 0, status: 'reported_zero' })).toBe('0 (reportado)');
    expect(formatScientificValue({ value: 10, status: 'censored', qualifier: '<10' })).toBe('<10');
    expect(formatScientificValue({ value: null, status: 'not_detected' })).toBe('No detectado');
    expect(formatScientificValue({ value: 0, status: 'invalid' })).toBe('Inválido');
    expect(scientificValueForChart({ value: 0, status: 'reported_zero' })).toBe(0);
    expect(scientificValueForChart({ value: 10, status: 'censored' })).toBeNull();
    expect(scientificValueForChart({ value: null, status: 'not_detected' })).toBeNull();
    expect(scientificValueForChart({ value: 0, status: 'invalid' })).toBeNull();
    expect(scientificValueForChart({ value: 99, status: 'future_status' as never })).toBeNull();
    expect(formatScientificValue({ value: 99, status: 'future_status' as never })).toBe(
      'Estado no reconocido',
    );
  });

  it('accepts only exact, reconciled approved-UAT metadata', () => {
    expect(validateApprovedUatMetadata(releaseIdentity, approvedMetadata)).toEqual([]);
  });

  it('rejects published, mismatched or unreconciled metadata', () => {
    expect(
      validateApprovedUatMetadata(releaseIdentity, {
        ...approvedMetadata,
        releaseIdentity: 'd'.repeat(64),
        state: 'published',
        isPublished: true,
        storedRawCellCount: 9,
      }),
    ).toEqual(
      expect.arrayContaining([
        'RELEASE_IDENTITY_MISMATCH',
        'RELEASE_UAT_STATE_INVALID',
        'RELEASE_STORAGE_COUNTS_INVALID',
      ]),
    );
  });

  it('rejects malformed successful metadata without throwing', () => {
    expect(validateApprovedUatMetadata(releaseIdentity, null)).toEqual([
      'RELEASE_METADATA_SHAPE_INVALID',
    ]);
    expect(() =>
      validateApprovedUatMetadata(releaseIdentity, {
        ...approvedMetadata,
        classifierVersion: 7,
        approvedBy: { forged: true },
        allowedMetricIds: ['*'],
      }),
    ).not.toThrow();
    expect(
      validateApprovedUatMetadata(releaseIdentity, {
        ...approvedMetadata,
        classifierVersion: 7,
        approvedBy: { forged: true },
        allowedMetricIds: ['*'],
      }),
    ).toEqual(
      expect.arrayContaining([
        'RELEASE_VERSION_IDENTITY_INVALID',
        'RELEASE_APPROVAL_EVIDENCE_INVALID',
        'RELEASE_ANALYTICS_SCOPE_INVALID',
      ]),
    );
  });
});
