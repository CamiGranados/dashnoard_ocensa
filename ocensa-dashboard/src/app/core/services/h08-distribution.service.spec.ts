import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { H08_DISTRIBUTION_PATH, H08DistributionService } from './h08-distribution.service';

describe('H08DistributionService', () => {
  let service: H08DistributionService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(H08DistributionService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('queries ChartSpec H08 with release identity and existing server-side filters', () => {
    service
      .getDistribution('release-1', {
        tank: 'TK7311',
        years: [2025, 2026],
        months: [1, 5],
      })
      .subscribe();

    const request = http.expectOne(
      (candidate) => candidate.url === `${environment.apiUrl}${H08_DISTRIBUTION_PATH}`,
    );

    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('datasetReleaseId')).toBe('release-1');
    expect(request.request.params.get('tankId')).toBe('TK7311');
    expect(request.request.params.getAll('years')).toEqual(['2025', '2026']);
    expect(request.request.params.getAll('months')).toEqual(['1', '5']);

    request.flush({});
  });
});
