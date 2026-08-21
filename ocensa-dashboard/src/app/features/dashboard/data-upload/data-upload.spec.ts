import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { MAX_IMPORT_BATCH_BYTES } from '../../../core/models/dataset-release.model';
import { Api } from '../../../core/services/api';
import { DatasetReleaseStore } from '../../../core/services/dataset-release-store.service';
import { FilesStore } from '../../../core/services/file-store.service';
import { DataUpload } from './data-upload';

describe('DataUpload', () => {
  let component: DataUpload;
  let fixture: ComponentFixture<DataUpload>;
  let filesStore: FilesStore;
  let releaseStore: DatasetReleaseStore;
  let api: Api;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DataUpload],
      providers: [provideHttpClient(), provideRouter([])],
    }).compileComponents();

    filesStore = TestBed.inject(FilesStore);
    releaseStore = TestBed.inject(DatasetReleaseStore);
    api = TestBed.inject(Api);
    fixture = TestBed.createComponent(DataUpload);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('creates without parsing an xlsx in the browser', () => {
    const arrayBuffer = vi.fn();
    const file = {
      name: 'dataset.xlsx',
      size: 1024,
      lastModified: 1,
      arrayBuffer,
    } as unknown as File;

    filesStore.setFiles([file]);
    fixture.detectChanges();

    expect(component).toBeTruthy();
    expect(arrayBuffer).not.toHaveBeenCalled();
  });

  it('rejects a file over 25 MiB before calling the API', async () => {
    const preflight = vi.spyOn(api, 'preflightImport');
    filesStore.setFiles([
      {
        name: 'oversize.xlsx',
        size: MAX_IMPORT_BATCH_BYTES + 1,
        lastModified: 1,
      } as File,
    ]);

    await component.proceed();

    expect(preflight).not.toHaveBeenCalled();
    expect(releaseStore.importState().code).toBe('IMPORT_SELECTION_INVALID');
    expect(releaseStore.hasPublishedRelease()).toBe(false);
  });

  it('keeps the dashboard blocked when preflight does not publish a release', async () => {
    filesStore.setFiles([new File(['x'], 'dataset.xlsx')]);
    vi.spyOn(api, 'preflightImport').mockResolvedValue({
      importBatchId: 'batch-1',
      status: 'blocked',
      code: 'IMPORT_STORAGE_NOT_READY',
      message: 'blocked',
      release: null,
      warnings: [],
      persistenceEnabled: false,
      publicationEnabled: false,
      importBatch: {
        batchIdentity: 'batch-1',
        fileSha256: 'abc',
        originalFileName: 'dataset.xlsx',
        fileSizeBytes: 1,
        schemaVersion: 'v1',
        classifierVersion: 'v1',
        inspectedAtUtc: '2026-08-20T12:00:00Z',
        state: 'blocked',
        blockedReasons: ['storage'],
        workbook: { sheetCount: 1, inspectedCellCount: 1, warnings: [], sheets: [] },
      },
      blockedRelease: {
        releaseIdentity: 'release-1',
        sourceBatchIdentity: 'batch-1',
        sourceFileSha256: 'abc',
        schemaVersion: 'v1',
        classifierVersion: 'v1',
        state: 'blocked',
        approvedBy: null,
        approvedAtUtc: null,
        blockedReasons: ['storage'],
      },
    });

    await component.proceed();
    fixture.detectChanges();

    expect(releaseStore.importState().kind).toBe('blocked');
    expect(releaseStore.release()).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('IMPORT_STORAGE_NOT_READY');
    expect(fixture.nativeElement.textContent).toContain('batch-1');
    expect(fixture.nativeElement.textContent).toContain('release-1');
  });
});
