import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { FileSelectEvent } from 'primeng/fileupload';
import { throwError } from 'rxjs';
import { vi } from 'vitest';
import { ImportBatchResponse } from '../../core/models/dataset-release.model';
import { DatasetReleaseStore } from '../../core/services/dataset-release-store.service';
import { FiltersService } from '../../core/services/filters.service';
import { TopbarFilters } from './topbar-filters';

const PUBLISHED_RESPONSE: ImportBatchResponse = {
  importBatchId: 'batch-1',
  status: 'published',
  code: 'DATASET_RELEASE_PUBLISHED',
  message: 'published',
  release: {
    releaseIdentity: 'release-1',
    sourceBatchIdentity: 'batch-1',
    sourceFileSha256: 'abc123',
    schemaVersion: 'schema-v1',
    classifierVersion: 'classifier-v1',
    state: 'published',
    approvedBy: 'reviewer',
    approvedAtUtc: '2026-08-20T12:00:00Z',
    blockedReasons: [],
  },
  warnings: [],
  persistenceEnabled: true,
  publicationEnabled: true,
  importBatch: {
    batchIdentity: 'batch-1',
    fileSha256: 'abc123',
    originalFileName: 'dataset.xlsx',
    fileSizeBytes: 1024,
    schemaVersion: 'schema-v1',
    classifierVersion: 'classifier-v1',
    inspectedAtUtc: '2026-08-20T12:00:00Z',
    state: 'published',
    blockedReasons: [],
    workbook: { sheetCount: 1, inspectedCellCount: 1, warnings: [], sheets: [] },
  },
  blockedRelease: null,
};

describe('TopbarFilters', () => {
  let component: TopbarFilters;
  let fixture: ComponentFixture<TopbarFilters>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TopbarFilters],
      providers: [provideHttpClient(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(TopbarFilters);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('creates with analytical filters disabled before publication', () => {
    expect(component).toBeTruthy();
    expect(component.hasPublishedRelease()).toBe(false);
    expect(component.tankOptions).toEqual([]);
  });

  it('validates selection metadata without reading file bytes', () => {
    const arrayBuffer = vi.fn();
    const file = {
      name: 'dataset.xlsx',
      size: 2048,
      lastModified: 1,
      arrayBuffer,
    } as unknown as File;
    component.excelUpload().files = [file];

    component.onFilesSelected({} as FileSelectEvent);

    expect(arrayBuffer).not.toHaveBeenCalled();
    expect(TestBed.inject(DatasetReleaseStore).importState().kind).toBe('selection_changed');
  });

  it('invalidates a published release when its filter query fails', async () => {
    const filtersService = TestBed.inject(FiltersService);
    vi.spyOn(filtersService, 'getYears').mockReturnValue(
      throwError(() => new Error('filter service unavailable')),
    );
    vi.spyOn(filtersService, 'getTanks').mockReturnValue(
      throwError(() => new Error('filter service unavailable')),
    );
    const releaseStore = TestBed.inject(DatasetReleaseStore);

    releaseStore.completeImport(PUBLISHED_RESPONSE);
    TestBed.tick();
    fixture.detectChanges();

    expect(releaseStore.release()).toBeNull();
    expect(releaseStore.importState()).toMatchObject({
      kind: 'blocked',
      code: 'RELEASE_QUERY_FAILED',
    });
    expect(component.tankOptions).toEqual([]);
  });
});
