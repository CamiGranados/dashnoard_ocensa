import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { FileSelectEvent } from 'primeng/fileupload';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { ImportBatchResponse } from '../../core/models/dataset-release.model';
import { DatasetReleaseStore } from '../../core/services/dataset-release-store.service';
import { FiltersStateService } from '../../core/services/filters-state.service';
import { FiltersService } from '../../core/services/filters.service';
import { TopbarFilters } from './topbar-filters';

const UAT_RELEASE_ID = 'a'.repeat(64);
const UAT_BATCH_ID = 'b'.repeat(64);
const UAT_FILE_SHA256 = 'c'.repeat(64);

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
    isPublished: true,
    blockedReasons: [],
  },
  warnings: [],
  persistenceEnabled: true,
  publicationEnabled: true,
  analyticsReadEnabled: true,
  published: true,
  importBatch: {
    batchIdentity: 'batch-1',
    fileSha256: 'abc123',
    originalFileName: 'dataset.xlsx',
    fileSizeBytes: 1024,
    schemaVersion: 'schema-v1',
    classifierVersion: 'classifier-v1',
    inspectedAtUtc: '2026-08-20T12:00:00Z',
    state: 'stored',
    blockedReasons: [],
    workbook: { sheetCount: 1, inspectedCellCount: 1, warnings: [], sheets: [] },
  },
  blockedRelease: null,
};

const UAT_RESPONSE: ImportBatchResponse = {
  ...PUBLISHED_RESPONSE,
  importBatchId: UAT_BATCH_ID,
  status: 'approved_uat',
  code: 'DATASET_RELEASE_APPROVED_UAT',
  message: 'Desarrollo · descriptivo provisional',
  publicationEnabled: false,
  analyticsReadEnabled: true,
  published: false,
  importBatch: {
    ...PUBLISHED_RESPONSE.importBatch,
    batchIdentity: UAT_BATCH_ID,
    fileSha256: UAT_FILE_SHA256,
    state: 'stored',
  },
  release: {
    ...PUBLISHED_RESPONSE.release!,
    releaseIdentity: UAT_RELEASE_ID,
    sourceBatchIdentity: UAT_BATCH_ID,
    sourceFileSha256: UAT_FILE_SHA256,
    state: 'approved',
    isPublished: false,
  },
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
    expect(component.hasQueryableRelease()).toBe(false);
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
    vi.spyOn(filtersService, 'getAnalysisFilterOptions').mockReturnValue(
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

  it('invalidates an approved UAT release when shared filter identity cannot be loaded', () => {
    const filtersService = TestBed.inject(FiltersService);
    vi.spyOn(filtersService, 'getAnalysisFilterOptions').mockReturnValue(
      throwError(() => new Error('filter service unavailable')),
    );
    const releaseStore = TestBed.inject(DatasetReleaseStore);

    releaseStore.completeImport(UAT_RESPONSE);
    TestBed.tick();
    fixture.detectChanges();

    expect(releaseStore.hasQueryableRelease()).toBe(false);
    expect(releaseStore.hasPublishedRelease()).toBe(false);
    expect(releaseStore.analysisReleaseId()).toBeNull();
    expect(releaseStore.importState()).toMatchObject({
      kind: 'blocked',
      code: 'RELEASE_QUERY_FAILED',
    });
    expect(component.filterLoadError()).toContain('No fue posible cargar filtros');
  });

  it('fails closed when filter options are ambiguous or not deterministically ordered', () => {
    const filtersService = TestBed.inject(FiltersService);
    vi.spyOn(filtersService, 'getAnalysisFilterOptions').mockReturnValue(
      of({
        datasetReleaseId: 'release-1',
        tanks: [
          { id: 'tk7311', name: 'tk7311' },
          { id: 'TK7311', name: 'TK7311' },
        ],
        years: [2026, 2025],
      }),
    );
    const releaseStore = TestBed.inject(DatasetReleaseStore);

    releaseStore.completeImport(PUBLISHED_RESPONSE);
    TestBed.tick();
    fixture.detectChanges();

    expect(releaseStore.release()).toBeNull();
    expect(component.tankOptions).toEqual([]);
    expect(component.yearOptions).toEqual([]);
    expect(component.filterLoadError()).toContain('no son verificables');
  });

  it('propagates an explicit tank clear back to the shared all-tanks filter', () => {
    vi.useFakeTimers();
    const filtersService = TestBed.inject(FiltersService);
    vi.spyOn(filtersService, 'getAnalysisFilterOptions').mockReturnValue(
      of({
        datasetReleaseId: 'release-1',
        tanks: [{ id: 'TK7311', name: 'TK7311' }],
        years: [2026],
      }),
    );
    const releaseStore = TestBed.inject(DatasetReleaseStore);
    const filtersState = TestBed.inject(FiltersStateService);

    releaseStore.completeImport(PUBLISHED_RESPONSE);
    TestBed.tick();
    component.tank = 'TK7311';
    component.onFiltersChange();
    vi.advanceTimersByTime(401);
    expect(filtersState.tanque()).toBe('TK7311');

    component.tank = null;
    component.onFiltersChange();
    vi.advanceTimersByTime(401);
    expect(filtersState.tanque()).toBeNull();
    vi.useRealTimers();
  });
});
