import { TestBed } from '@angular/core/testing';
import { DatasetReleaseStore } from './dataset-release-store.service';
import { ImportBatchResponse } from '../models/dataset-release.model';

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
            blockedReasons: [],
          }
        : null,
    warnings: [],
    persistenceEnabled: state === 'published',
    publicationEnabled: state === 'published',
    importBatch: {
      batchIdentity: 'batch-1',
      fileSha256: 'abc123',
      originalFileName: 'dataset.xlsx',
      fileSizeBytes: 10,
      schemaVersion: 'schema-v1',
      classifierVersion: 'raw-v1',
      inspectedAtUtc: '2026-08-20T12:00:00Z',
      state,
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

describe('DatasetReleaseStore', () => {
  let store: DatasetReleaseStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = TestBed.inject(DatasetReleaseStore);
  });

  it('publishes only an explicit, complete published release', () => {
    store.completeImport(response('published'));

    expect(store.hasPublishedRelease()).toBe(true);
    expect(store.releaseId()).toBe('release-1');
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
});
