import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { DatasetReleaseMetadataService } from './dataset-release-metadata.service';

describe('DatasetReleaseMetadataService', () => {
  let service: DatasetReleaseMetadataService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(DatasetReleaseMetadataService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('queries one explicit encoded identity and never a latest endpoint', () => {
    service.getExactRelease('a/b').subscribe();

    const request = http.expectOne(`${environment.apiUrl}/v1/dataset-releases/a%2Fb`);
    expect(request.request.method).toBe('GET');
    expect(request.request.url).not.toContain('latest');
    request.flush({});
  });
});
