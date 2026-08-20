import { describe, expect, it, vi } from 'vitest';
import {
  MAX_IMPORT_BATCH_BYTES,
  formatScientificValue,
  scientificValueForChart,
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
    expect(
      scientificValueForChart({ value: 99, status: 'future_status' as never }),
    ).toBeNull();
    expect(
      formatScientificValue({ value: 99, status: 'future_status' as never }),
    ).toBe('Estado no reconocido');
  });
});
