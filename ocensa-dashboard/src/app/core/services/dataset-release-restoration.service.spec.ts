import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Observable, Subject, of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { DatasetReleaseMetadataResponse } from '../models/dataset-release.model';
import { DatasetReleaseMetadataService } from './dataset-release-metadata.service';
import {
  DatasetReleaseRestorationService,
  isPermanentRestorationFailure,
} from './dataset-release-restoration.service';
import {
  APPROVED_UAT_RELEASE_SESSION_KEY,
  DatasetReleaseStore,
} from './dataset-release-store.service';
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
    allowedMetricIds: ['THPS.DATA.COVERAGE.V1', 'THPS.MICRO.GROUP.CONTROL.V1'],
    allowedChartIds: ['H08', 'H11'],
    ...overrides,
  };
}

function configure(
  storage: ReleaseSessionStorage | null,
  response: () => Observable<DatasetReleaseMetadataResponse>,
) {
  const metadataService = { getExactRelease: vi.fn(response) };
  TestBed.configureTestingModule({
    providers: [
      { provide: RELEASE_SESSION_STORAGE, useValue: storage },
      { provide: DatasetReleaseMetadataService, useValue: metadataService },
    ],
  });
  return {
    restoration: TestBed.inject(DatasetReleaseRestorationService),
    store: TestBed.inject(DatasetReleaseStore),
    metadataService,
  };
}

describe('DatasetReleaseRestorationService', () => {
  it('restores a valid exact release only after the API re-proves UAT approval', async () => {
    const storage = new MemorySessionStorage();
    storage.setItem(APPROVED_UAT_RELEASE_SESSION_KEY, RELEASE_ID);
    const { restoration, store, metadataService } = configure(storage, () => of(metadata()));

    await restoration.restore();

    expect(metadataService.getExactRelease).toHaveBeenCalledWith(RELEASE_ID);
    expect(store.analysisReleaseId()).toBe(RELEASE_ID);
    expect(store.hasQueryableRelease()).toBe(true);
    expect(store.hasPublishedRelease()).toBe(false);
    expect(store.releaseId()).toBeNull();
  });

  it.each([404, 410])('clears a stale candidate after HTTP %s', async (status) => {
    const storage = new MemorySessionStorage();
    storage.setItem(APPROVED_UAT_RELEASE_SESSION_KEY, RELEASE_ID);
    const { restoration, store } = configure(storage, () =>
      throwError(
        () =>
          new HttpErrorResponse({
            status,
            error: { code: 'DATASET_RELEASE_NOT_FOUND', message: 'Release obsoleto.' },
          }),
      ),
    );

    await restoration.restore();

    expect(storage.getItem(APPROVED_UAT_RELEASE_SESSION_KEY)).toBeNull();
    expect(store.release()).toBeNull();
    expect(store.importState().code).toBe('RELEASE_RESTORE_CANDIDATE_REJECTED');
  });

  it('clears a candidate when a 503 explicitly proves identity mismatch', async () => {
    const storage = new MemorySessionStorage();
    storage.setItem(APPROVED_UAT_RELEASE_SESSION_KEY, RELEASE_ID);
    const { restoration, store } = configure(storage, () =>
      throwError(
        () =>
          new HttpErrorResponse({
            status: 503,
            error: {
              code: 'DEVELOPMENT_RELEASE_IDENTITY_MISMATCH',
              message: 'No coincide con la allowlist exacta.',
            },
          }),
      ),
    );

    await restoration.restore();

    expect(storage.getItem(APPROVED_UAT_RELEASE_SESSION_KEY)).toBeNull();
    expect(store.release()).toBeNull();
  });

  it('keeps only the identity candidate on transient failure and exposes no old result', async () => {
    const storage = new MemorySessionStorage();
    storage.setItem(APPROVED_UAT_RELEASE_SESSION_KEY, RELEASE_ID);
    const { restoration, store } = configure(storage, () =>
      throwError(
        () =>
          new HttpErrorResponse({
            status: 503,
            error: {
              code: 'DEVELOPMENT_RELEASE_STORAGE_UNAVAILABLE',
              message: 'Storage temporalmente no disponible.',
            },
          }),
      ),
    );

    await restoration.restore();

    expect(storage.getItem(APPROVED_UAT_RELEASE_SESSION_KEY)).toBe(RELEASE_ID);
    expect(store.release()).toBeNull();
    expect(store.hasQueryableRelease()).toBe(false);
    expect(store.importState()).toMatchObject({
      kind: 'error',
      code: 'RELEASE_RESTORE_TRANSIENT_FAILURE',
    });
  });

  it('rejects a forged 200 response and clears its candidate', async () => {
    const storage = new MemorySessionStorage();
    storage.setItem(APPROVED_UAT_RELEASE_SESSION_KEY, RELEASE_ID);
    const { restoration, store } = configure(storage, () =>
      of(metadata({ releaseIdentity: 'd'.repeat(64) })),
    );

    await restoration.restore();

    expect(storage.getItem(APPROVED_UAT_RELEASE_SESSION_KEY)).toBeNull();
    expect(store.release()).toBeNull();
    expect(store.importState().code).toBe('RELEASE_RESTORE_METADATA_INVALID');
  });

  it('treats a malformed successful body as invalid metadata, not as a transient release', async () => {
    const storage = new MemorySessionStorage();
    storage.setItem(APPROVED_UAT_RELEASE_SESSION_KEY, RELEASE_ID);
    const { restoration, store } = configure(storage, () =>
      of(null as unknown as DatasetReleaseMetadataResponse),
    );

    await restoration.restore();

    expect(storage.getItem(APPROVED_UAT_RELEASE_SESSION_KEY)).toBeNull();
    expect(store.release()).toBeNull();
    expect(store.importState().code).toBe('RELEASE_RESTORE_METADATA_INVALID');
  });

  it('ignores a completed metadata request after upload selection supersedes bootstrap', async () => {
    const storage = new MemorySessionStorage();
    storage.setItem(APPROVED_UAT_RELEASE_SESSION_KEY, RELEASE_ID);
    const response = new Subject<DatasetReleaseMetadataResponse>();
    const { restoration, store } = configure(storage, () => response.asObservable());
    const pending = restoration.restore();

    store.selectionChanged([new File(['new'], 'new.xlsx')]);
    response.next(metadata());
    await pending;

    expect(store.release()).toBeNull();
    expect(store.importState().kind).toBe('selection_changed');
    expect(storage.getItem(APPROVED_UAT_RELEASE_SESSION_KEY)).toBeNull();
  });

  it('does nothing in SSR or another environment without sessionStorage', async () => {
    const { restoration, store, metadataService } = configure(null, () => of(metadata()));

    await restoration.restore();

    expect(metadataService.getExactRelease).not.toHaveBeenCalled();
    expect(store.release()).toBeNull();
  });

  it('drops forged session content without issuing a metadata request', async () => {
    const storage = new MemorySessionStorage();
    storage.setItem(APPROVED_UAT_RELEASE_SESSION_KEY, 'latest');
    const { restoration, metadataService } = configure(storage, () => of(metadata()));

    await restoration.restore();

    expect(metadataService.getExactRelease).not.toHaveBeenCalled();
    expect(storage.getItem(APPROVED_UAT_RELEASE_SESSION_KEY)).toBeNull();
  });
});

describe('isPermanentRestorationFailure', () => {
  it('distinguishes stale identity from a transient provider failure', () => {
    expect(isPermanentRestorationFailure(new HttpErrorResponse({ status: 404 }))).toBe(true);
    expect(
      isPermanentRestorationFailure(
        new HttpErrorResponse({
          status: 503,
          error: { code: 'DEVELOPMENT_RELEASE_IDENTITY_MISMATCH' },
        }),
      ),
    ).toBe(true);
    expect(
      isPermanentRestorationFailure(
        new HttpErrorResponse({
          status: 503,
          error: { code: 'DEVELOPMENT_RELEASE_STORAGE_UNAVAILABLE' },
        }),
      ),
    ).toBe(false);
  });
});
