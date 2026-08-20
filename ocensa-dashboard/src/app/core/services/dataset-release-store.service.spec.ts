import { TestBed } from '@angular/core/testing';
import {
  APPROVED_UAT_RELEASE_SESSION_KEY,
  DatasetReleaseStore,
} from './dataset-release-store.service';
import {
  DatasetReleaseMetadataResponse,
  ImportBatchResponse,
} from '../models/dataset-release.model';
import { RELEASE_SESSION_STORAGE, ReleaseSessionStorage } from './release-session-storage.token';

const RELEASE_ID = 'a'.repeat(64);
const BATCH_ID = 'b'.repeat(64);
const FILE_SHA256 = 'c'.repeat(64);

class MemorySessionStorage implements ReleaseSessionStorage {
  readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

function response(state: 'blocked' | 'published'): ImportBatchResponse {
  return {
    importBatchId: 'batch-1',
    status: state,
    code: state === 'blocked' ? 'IMPORT_STORAGE_NOT_READY' : 'DATASET_RELEASE_PUBLISHED',
    message: state,
    release:
      state === 'published'
        ? {
            releaseIdentity: 'release-1',
            sourceBatchIdentity: 'batch-1',
            sourceFileSha256: 'abc123',
            schemaVersion: 'schema-v1',
            classifierVersion: 'raw-v1',
            state,
            approvedBy: 'reviewer',
            approvedAtUtc: '2026-08-20T12:00:00Z',
            isPublished: true,
            blockedReasons: [],
          }
        : null,
    warnings: [],
    persistenceEnabled: state === 'published',
    publicationEnabled: state === 'published',
    analyticsReadEnabled: state === 'published',
    published: state === 'published',
    importBatch: {
      batchIdentity: 'batch-1',
      fileSha256: 'abc123',
      originalFileName: 'dataset.xlsx',
      fileSizeBytes: 10,
      schemaVersion: 'schema-v1',
      classifierVersion: 'raw-v1',
      inspectedAtUtc: '2026-08-20T12:00:00Z',
      state: state === 'published' ? 'stored' : 'blocked',
      blockedReasons: state === 'blocked' ? ['storage'] : [],
      workbook: { sheetCount: 1, inspectedCellCount: 1, warnings: [], sheets: [] },
    },
    blockedRelease:
      state === 'blocked'
        ? {
            releaseIdentity: 'release-1',
            sourceBatchIdentity: 'batch-1',
            sourceFileSha256: 'abc123',
            schemaVersion: 'schema-v1',
            classifierVersion: 'raw-v1',
            state,
            approvedBy: null,
            approvedAtUtc: null,
            blockedReasons: ['storage'],
          }
        : null,
  };
}

function uatResponse(): ImportBatchResponse {
  return {
    ...response('blocked'),
    importBatchId: BATCH_ID,
    status: 'approved_uat',
    code: 'DATASET_RELEASE_APPROVED_UAT',
    message: 'Desarrollo · descriptivo provisional',
    persistenceEnabled: true,
    publicationEnabled: false,
    analyticsReadEnabled: true,
    published: false,
    importBatch: {
      ...response('blocked').importBatch,
      batchIdentity: BATCH_ID,
      fileSha256: FILE_SHA256,
      state: 'stored',
      blockedReasons: [],
    },
    release: {
      releaseIdentity: RELEASE_ID,
      sourceBatchIdentity: BATCH_ID,
      sourceFileSha256: FILE_SHA256,
      schemaVersion: 'schema-v1',
      classifierVersion: 'raw-v1',
      state: 'approved',
      approvedBy: 'uat-reviewer',
      approvedAtUtc: '2026-08-20T12:00:00Z',
      isPublished: false,
      blockedReasons: [],
    },
    blockedRelease: null,
  };
}

function metadata(
  overrides: Partial<DatasetReleaseMetadataResponse> = {},
): DatasetReleaseMetadataResponse {
  return {
    releaseIdentity: RELEASE_ID,
    importBatchId: BATCH_ID,
    fileSha256: FILE_SHA256,
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
    ...overrides,
  };
}

describe('DatasetReleaseStore', () => {
  let store: DatasetReleaseStore;
  let storage: MemorySessionStorage;

  beforeEach(() => {
    storage = new MemorySessionStorage();
    TestBed.configureTestingModule({
      providers: [{ provide: RELEASE_SESSION_STORAGE, useValue: storage }],
    });
    store = TestBed.inject(DatasetReleaseStore);
  });

  it('publishes only an explicit, complete published release', () => {
    store.completeImport(response('published'));

    expect(store.hasPublishedRelease()).toBe(true);
    expect(store.releaseId()).toBe('release-1');
    expect(store.analysisReleaseId()).toBe('release-1');
  });

  it('keeps an approved UAT release queryable but never published', () => {
    store.completeImport(uatResponse());

    expect(store.hasQueryableRelease()).toBe(true);
    expect(store.analysisReleaseId()).toBe(RELEASE_ID);
    expect(store.hasPublishedRelease()).toBe(false);
    expect(store.releaseId()).toBeNull();
    expect(store.isDevelopmentAnalysis()).toBe(true);
    expect(store.importState()).toMatchObject({ kind: 'approved_uat' });
  });

  it('fails closed when UAT flags are mixed with publication', () => {
    const inconsistent = uatResponse();
    inconsistent.publicationEnabled = true;

    store.completeImport(inconsistent);

    expect(store.hasQueryableRelease()).toBe(false);
    expect(store.release()).toBeNull();
    expect(store.importState().kind).toBe('blocked');
  });

  it('fails closed when the approved-UAT import identities do not reconcile exactly', () => {
    const inconsistent = uatResponse();
    inconsistent.release!.sourceFileSha256 = 'd'.repeat(64);

    store.completeImport(inconsistent);

    expect(store.hasQueryableRelease()).toBe(false);
    expect(store.release()).toBeNull();
    expect(storage.getItem(APPROVED_UAT_RELEASE_SESSION_KEY)).toBeNull();
  });

  it('fails closed when preflight succeeds without publication', () => {
    store.completeImport(response('blocked'));

    expect(store.hasPublishedRelease()).toBe(false);
    expect(store.importState().kind).toBe('blocked');
  });

  it('invalidates a published release as soon as selection changes', () => {
    store.completeImport(response('published'));

    store.selectionChanged([new File(['x'], 'next.xlsx')]);

    expect(store.release()).toBeNull();
    expect(store.importState().kind).toBe('selection_changed');
  });

  it('clears the release on import failure', () => {
    store.completeImport(response('published'));
    store.failImport({ kind: 'blocked', code: 'IMPORT_STORAGE_NOT_READY', message: 'blocked' });

    expect(store.hasPublishedRelease()).toBe(false);
    expect(store.importState().code).toBe('IMPORT_STORAGE_NOT_READY');
  });

  it('stores only the canonical UAT release identity in sessionStorage', () => {
    store.completeImport(uatResponse());

    expect([...storage.values.entries()]).toEqual([[APPROVED_UAT_RELEASE_SESSION_KEY, RELEASE_ID]]);
    expect(storage.getItem(APPROVED_UAT_RELEASE_SESSION_KEY)).not.toContain(FILE_SHA256);
  });

  it('restores only metadata that re-proves the exact approved UAT identity', () => {
    storage.setItem(APPROVED_UAT_RELEASE_SESSION_KEY, RELEASE_ID);
    const snapshot = store.restorationSnapshot();

    expect(store.restoreApprovedUat(RELEASE_ID, metadata(), snapshot)).toBe('restored');
    expect(store.analysisReleaseId()).toBe(RELEASE_ID);
    expect(store.hasQueryableRelease()).toBe(true);
    expect(store.hasPublishedRelease()).toBe(false);
    expect(store.releaseId()).toBeNull();
    expect(store.release()).toMatchObject({
      status: 'approved_uat',
      isPublished: false,
      sourceSha256: FILE_SHA256,
      classifierVersion: 'raw-cell-classifier-v1',
    });
  });

  it('rejects forged or inconsistent metadata and clears the stored candidate', () => {
    storage.setItem(APPROVED_UAT_RELEASE_SESSION_KEY, RELEASE_ID);
    const snapshot = store.restorationSnapshot();

    expect(
      store.restoreApprovedUat(
        RELEASE_ID,
        metadata({ state: 'published', isPublished: true, analyticsReadEnabled: true }),
        snapshot,
      ),
    ).toBe('invalid');
    expect(store.release()).toBeNull();
    expect(storage.getItem(APPROVED_UAT_RELEASE_SESSION_KEY)).toBeNull();
    expect(store.importState().code).toBe('RELEASE_RESTORE_METADATA_INVALID');
  });

  it('drops forged storage before making it a restoration candidate', () => {
    storage.setItem(APPROVED_UAT_RELEASE_SESSION_KEY, JSON.stringify(metadata()));

    expect(store.readApprovedUatCandidate()).toBeNull();
    expect(storage.getItem(APPROVED_UAT_RELEASE_SESSION_KEY)).toBeNull();
  });

  it('does not let a restoration response race a newer file selection', () => {
    storage.setItem(APPROVED_UAT_RELEASE_SESSION_KEY, RELEASE_ID);
    const snapshot = store.restorationSnapshot();

    store.selectionChanged([new File(['x'], 'next.xlsx')]);

    expect(store.restoreApprovedUat(RELEASE_ID, metadata(), snapshot)).toBe('superseded');
    expect(store.release()).toBeNull();
    expect(storage.getItem(APPROVED_UAT_RELEASE_SESSION_KEY)).toBeNull();
    expect(store.importState().kind).toBe('selection_changed');
  });

  it('clears the restoration candidate on failure and query invalidation', () => {
    store.completeImport(uatResponse());
    store.failImport({ kind: 'error', code: 'IMPORT_FAILED', message: 'failed' });
    expect(storage.getItem(APPROVED_UAT_RELEASE_SESSION_KEY)).toBeNull();

    store.completeImport(uatResponse());
    store.invalidateForQueryFailure();
    expect(storage.getItem(APPROVED_UAT_RELEASE_SESSION_KEY)).toBeNull();
  });
});
