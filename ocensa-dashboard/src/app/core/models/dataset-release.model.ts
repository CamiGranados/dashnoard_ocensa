export const MAX_IMPORT_BATCH_BYTES = 25 * 1024 * 1024;
export const MAX_IMPORT_FILES = 1;

export type ScientificValueStatus =
  'observed' | 'reported_zero' | 'censored' | 'not_detected' | 'missing' | 'invalid';

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
  status: 'published' | 'approved_uat';
  publishedAt: string | null;
  approvedAt: string;
  isPublished: boolean;
  analyticsReadEnabled: boolean;
  sourceSha256: string;
  classifierVersion: string;
  /** Count of persisted raw cells, never presented as samples or business records. */
  storedRawCellCount?: number | null;
}

/** Exact camelCase wire contract returned by GET /api/v1/dataset-releases/{identity}. */
export interface DatasetReleaseMetadataResponse {
  releaseIdentity: string;
  importBatchId: string;
  fileSha256: string;
  schemaVersion: string;
  classifierVersion: string;
  state: 'blocked' | 'pending_approval' | 'approved' | 'published';
  isPublished: boolean;
  approvedBy: string | null;
  approvedAtUtc: string | null;
  createdAtUtc: string;
  declaredSheetCount: number;
  storedSheetCount: number;
  declaredCellCount: number;
  storedRawCellCount: number;
  analyticsReadEnabled: boolean;
  allowedMetricIds: string[];
  allowedChartIds: string[];
}

export function isCanonicalSha256(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);
}

/**
 * Checks only server metadata invariants. The candidate remains untrusted until
 * this exact response is received; nothing from sessionStorage is treated as approval.
 */
export function validateApprovedUatMetadata(candidate: string, wire: unknown): string[] {
  if (typeof wire !== 'object' || wire === null || Array.isArray(wire)) {
    return ['RELEASE_METADATA_SHAPE_INVALID'];
  }
  const metadata = wire as DatasetReleaseMetadataResponse;
  const issues: string[] = [];
  const approvedAt =
    typeof metadata.approvedAtUtc === 'string' ? Date.parse(metadata.approvedAtUtc) : Number.NaN;
  const createdAt =
    typeof metadata.createdAtUtc === 'string' ? Date.parse(metadata.createdAtUtc) : Number.NaN;
  const safeIdentifier = (value: unknown, maxLength = 128): value is string =>
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= maxLength &&
    value === value.trim() &&
    /^[A-Za-z0-9._-]+$/.test(value);

  if (
    !isCanonicalSha256(candidate) ||
    metadata.releaseIdentity !== candidate ||
    !isCanonicalSha256(metadata.releaseIdentity)
  ) {
    issues.push('RELEASE_IDENTITY_MISMATCH');
  }
  if (!isCanonicalSha256(metadata.importBatchId) || !isCanonicalSha256(metadata.fileSha256)) {
    issues.push('RELEASE_SOURCE_IDENTITY_INVALID');
  }
  if (
    !safeIdentifier(metadata.schemaVersion, 64) ||
    !safeIdentifier(metadata.classifierVersion, 64)
  ) {
    issues.push('RELEASE_VERSION_IDENTITY_INVALID');
  }
  if (
    metadata.state !== 'approved' ||
    metadata.isPublished !== false ||
    metadata.analyticsReadEnabled !== true
  ) {
    issues.push('RELEASE_UAT_STATE_INVALID');
  }
  if (
    typeof metadata.approvedBy !== 'string' ||
    !metadata.approvedBy.trim() ||
    !Number.isFinite(approvedAt) ||
    !Number.isFinite(createdAt) ||
    approvedAt < createdAt
  ) {
    issues.push('RELEASE_APPROVAL_EVIDENCE_INVALID');
  }
  if (
    !Number.isSafeInteger(metadata.declaredSheetCount) ||
    !Number.isSafeInteger(metadata.storedSheetCount) ||
    !Number.isSafeInteger(metadata.declaredCellCount) ||
    !Number.isSafeInteger(metadata.storedRawCellCount) ||
    metadata.declaredSheetCount <= 0 ||
    metadata.declaredCellCount <= 0 ||
    metadata.declaredSheetCount !== metadata.storedSheetCount ||
    metadata.declaredCellCount !== metadata.storedRawCellCount
  ) {
    issues.push('RELEASE_STORAGE_COUNTS_INVALID');
  }
  if (
    !Array.isArray(metadata.allowedMetricIds) ||
    !Array.isArray(metadata.allowedChartIds) ||
    metadata.allowedMetricIds.length === 0 ||
    metadata.allowedChartIds.length === 0 ||
    metadata.allowedMetricIds.length > 64 ||
    metadata.allowedChartIds.length > 64 ||
    metadata.allowedMetricIds.some((id) => !safeIdentifier(id)) ||
    metadata.allowedChartIds.some((id) => !safeIdentifier(id)) ||
    new Set(metadata.allowedMetricIds).size !== metadata.allowedMetricIds.length ||
    new Set(metadata.allowedChartIds).size !== metadata.allowedChartIds.length
  ) {
    issues.push('RELEASE_ANALYTICS_SCOPE_INVALID');
  }

  return issues;
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
  state: 'blocked' | 'stored';
  blockedReasons: string[];
  workbook: ImportWorkbookInspection;
}

export interface DatasetReleaseWire {
  releaseIdentity: string;
  sourceBatchIdentity: string;
  sourceFileSha256: string;
  schemaVersion: string;
  classifierVersion: string;
  state: 'blocked' | 'pending_approval' | 'approved' | 'published';
  approvedBy: string | null;
  approvedAtUtc: string | null;
  isPublished?: boolean;
  blockedReasons: string[];
}

/** Exact camelCase wire contract returned by /api/v1/import-batches. */
export interface ImportBatchResponse {
  importBatchId: string;
  status: 'blocked' | 'pending_approval' | 'approved' | 'approved_uat' | 'published';
  code: string;
  message: string;
  release: DatasetReleaseWire | null;
  warnings: string[];
  persistenceEnabled: boolean;
  publicationEnabled: boolean;
  analyticsReadEnabled?: boolean;
  published?: boolean;
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
  | 'approved_uat'
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

export function formatScientificValue(
  value: ScientificValue<number | string> | null | undefined,
): string {
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
