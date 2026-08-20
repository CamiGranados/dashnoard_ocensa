import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { Api, classifyImportFailure } from './api';

describe('Api', () => {
  let service: Api;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(Api);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('sends exactly one multipart section named file to the versioned endpoint', async () => {
    const file = new File(['safe-checkpoint'], 'dataset.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const promise = service.preflightImport([file]);
    const request = http.expectOne(`${environment.apiUrl}/v1/import-batches`);

    expect(request.request.method).toBe('POST');
    expect(request.request.body).toBeInstanceOf(FormData);
    const formData = request.request.body as FormData;
    expect(formData.getAll('file')).toHaveLength(1);
    const uploadedFile = formData.get('file') as File;
    expect(uploadedFile).toBeInstanceOf(File);
    expect(uploadedFile.name).toBe('dataset.xlsx');
    expect(uploadedFile.size).toBe(file.size);
    expect(formData.getAll('files')).toHaveLength(0);
    expect(Array.from(formData.keys())).toEqual(['file']);

    request.flush({
      importBatchId: 'batch-1',
      status: 'blocked',
      code: 'IMPORT_STORAGE_NOT_READY',
      message: 'blocked',
      release: null,
      warnings: [],
      persistenceEnabled: false,
      publicationEnabled: false,
      importBatch: { batchIdentity: 'batch-1', state: 'blocked' },
      blockedRelease: { releaseIdentity: 'release-1', state: 'blocked' },
    });

    await expect(promise).resolves.toMatchObject({
      code: 'IMPORT_STORAGE_NOT_READY',
      publicationEnabled: false,
    });
  });

  it('does not make a request when selection is not exactly one file', async () => {
    const first = new File(['a'], 'a.xlsx');
    const second = new File(['b'], 'b.xlsx');

    await expect(service.preflightImport([])).rejects.toThrow('exactamente un archivo');
    await expect(service.preflightImport([first, second])).rejects.toThrow('exactamente un archivo');
    http.expectNone(`${environment.apiUrl}/v1/import-batches`);
  });

  it('maps 410 and 503 to explicit fail-closed states', () => {
    expect(
      classifyImportFailure(
        new HttpErrorResponse({ status: 410, error: { code: 'LEGACY_IMPORT_RETIRED' } }),
      ),
    ).toMatchObject({ kind: 'retired', code: 'LEGACY_IMPORT_RETIRED' });

    expect(
      classifyImportFailure(
        new HttpErrorResponse({
          status: 503,
          error: {
            code: 'IMPORT_STORAGE_NOT_READY',
            importBatchId: 'batch-1',
            importBatch: { batchIdentity: 'batch-1' },
            release: null,
            blockedRelease: { releaseIdentity: 'release-1' },
          },
        }),
      ),
    ).toMatchObject({
      kind: 'blocked',
      code: 'IMPORT_STORAGE_NOT_READY',
      importBatchId: 'batch-1',
      releaseIdentity: 'release-1',
    });
  });
});
