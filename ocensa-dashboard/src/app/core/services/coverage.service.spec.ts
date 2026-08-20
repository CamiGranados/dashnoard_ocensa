import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { COVERAGE_METRIC_PATH, CoverageService } from './coverage.service';

describe('CoverageService', () => {
  let service: CoverageService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CoverageService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('queries the immutable metric with release and server-side filters', () => {
    service
      .getCoverage('release-1', {
        tank: 'TK7311',
        years: [2025, 2026],
        months: [1, 5],
      })
      .subscribe();

    const request = http.expectOne((candidate) =>
      candidate.url === `${environment.apiUrl}${COVERAGE_METRIC_PATH}`,
    );

    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('datasetReleaseId')).toBe('release-1');
    expect(request.request.params.get('tankId')).toBe('TK7311');
    expect(request.request.params.getAll('years')).toEqual(['2025', '2026']);
    expect(request.request.params.getAll('months')).toEqual(['1', '5']);

    request.flush({});
  });
});
