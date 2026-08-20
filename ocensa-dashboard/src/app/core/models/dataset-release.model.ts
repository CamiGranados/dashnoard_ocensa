export const MAX_IMPORT_BATCH_BYTES = 25 * 1024 * 1024;
export const MAX_IMPORT_FILES = 1;

export type ScientificValueStatus =
  | 'observed'
  | 'reported_zero'
  | 'censored'
  | 'not_detected'
  | 'missing'
  | 'invalid';

/**
 * A measured value as published by the backend. Status is mandatory so the UI never
 * turns a missing/censored value into zero, nor silently treats a reported zero as missing.
 */
export interface ScientificValue<T> {
  value: T | null;
  status: ScientificValueStatus;
  qualifier?: string | null;
  unit?: string | null;
}

export interface DatasetRelease {
  releaseId: string;
  status: 'published';
  publishedAt: string;
  sourceSha256: string;
  classifierVersion: string;
  recordCount?: number | null;
}

export interface ImportLineageSample {
  sheetName: string;
  sourceCell: string;
  rawText: string;
  numericValue: number | null;
  qualifier: string | null;
  unit: string | null;
  status: string;
  parseRuleId: string;
  cellDataType: string;
  formulaA1: string | null;
  warning: string | null;
}

export interface ImportWorkbookInspection {
  sheetCount: number;
  inspectedCellCount: number;
  warnings: string[];
  sheets: Array<{
    sheetIndex: number;
    sheetName: string;
    headerRowSource: string | null;
    headers: string[];
    dataRowCount: number;
    inspectedCellCount: number;
    statusCounts: Record<string, number>;
    lineageSamples: ImportLineageSample[];
    warnings: string[];
  }>;
}

export interface ImportBatchWire {
  batchIdentity: string;
  fileSha256: string;
  originalFileName: string;
  fileSizeBytes: number;
  schemaVersion: string;
  classifierVersion: string;
  inspectedAtUtc: string;
  state: 'blocked' | 'published';
  blockedReasons: string[];
  workbook: ImportWorkbookInspection;
}

export interface DatasetReleaseWire {
  releaseIdentity: string;
  sourceBatchIdentity: string;
  sourceFileSha256: string;
  schemaVersion: string;
  classifierVersion: string;
  state: 'blocked' | 'published';
  approvedBy: string | null;
  approvedAtUtc: string | null;
  blockedReasons: string[];
  recordCount?: number | null;
}

/** Exact camelCase wire contract returned by /api/v1/import-batches. */
export interface ImportBatchResponse {
  importBatchId: string;
  status: 'blocked' | 'published';
  code: string;
  message: string;
  release: DatasetReleaseWire | null;
  warnings: string[];
  persistenceEnabled: boolean;
  publicationEnabled: boolean;
  importBatch: ImportBatchWire;
  blockedRelease: DatasetReleaseWire | null;
}

export type ImportUiStateKind =
  | 'idle'
  | 'selection_changed'
  | 'uploading'
  | 'blocked'
  | 'retired'
  | 'error'
  | 'published';

export interface ImportUiState {
  kind: ImportUiStateKind;
  code?: string | null;
  message: string;
  importBatchId?: string | null;
  releaseIdentity?: string | null;
}

export interface ImportFailure {
  kind: Extract<ImportUiStateKind, 'blocked' | 'retired' | 'error'>;
  code: string;
  message: string;
  importBatchId?: string | null;
  releaseIdentity?: string | null;
}

export interface SelectedFileMetadata {
  name: string;
  size: number;
  lastModified: number;
}

export interface SelectionValidation {
  valid: boolean;
  errors: string[];
  totalBytes: number;
}

export function validateImportSelection(files: readonly File[]): SelectionValidation {
  const errors: string[] = [];
  const totalBytes = files.reduce((total, file) => total + file.size, 0);

  if (!files.length) {
    errors.push('Seleccione al menos un archivo .xlsx.');
  }

  if (files.length > MAX_IMPORT_FILES) {
    errors.push('El contrato actual admite exactamente un archivo por importación.');
  }

  for (const file of files) {
    if (!file.name.toLocaleLowerCase().endsWith('.xlsx')) {
      errors.push(`${file.name}: la extensión permitida es .xlsx.`);
    }
    if (file.size === 0) {
      errors.push(`${file.name}: el archivo está vacío.`);
    }
    if (file.size > MAX_IMPORT_BATCH_BYTES) {
      errors.push(`${file.name}: supera el límite de 25 MiB.`);
    }
  }

  if (totalBytes > MAX_IMPORT_BATCH_BYTES) {
    errors.push('El lote completo supera el límite de 25 MiB.');
  }

  const seen = new Set<string>();
  for (const file of files) {
    const key = `${file.name.trim().toLocaleLowerCase()}|${file.size}`;
    if (seen.has(key)) {
      errors.push(`${file.name}: archivo duplicado en el lote.`);
    }
    seen.add(key);
  }

  return { valid: errors.length === 0, errors, totalBytes };
}

export function scientificValueForChart(value: ScientificValue<number>): number | null {
  if (value.status === 'reported_zero') return 0;
  if (value.status === 'observed') {
    return typeof value.value === 'number' && Number.isFinite(value.value) ? value.value : null;
  }
  return null;
}

export function formatScientificValue(value: ScientificValue<number | string> | null | undefined): string {
  if (!value || value.status === 'missing') return '—';
  if (value.status === 'reported_zero') return '0 (reportado)';
  if (value.status === 'not_detected') return 'No detectado';
  if (value.status === 'invalid') return 'Inválido';
  if (value.status === 'censored') {
    if (value.qualifier?.trim()) return value.qualifier.trim();
    return value.value === null ? 'Censurado' : `≤ ${String(value.value)} (censurado)`;
  }
  if (value.status === 'observed') return value.value === null ? '—' : String(value.value);
  return 'Estado no reconocido';
}
