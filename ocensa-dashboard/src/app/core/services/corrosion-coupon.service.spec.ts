import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { CORROSION_COUPON_CHART_PATH, CorrosionCouponService } from './corrosion-coupon.service';

describe('CorrosionCouponService', () => {
  let service: CorrosionCouponService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CorrosionCouponService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('queries the exact H10 coupon ChartSpec with release identity and server filters', () => {
    service
      .getChart('release-1', {
        tank: 'TK7311',
        years: [2025, 2026],
        months: [1, 5],
      })
      .subscribe();

    const request = http.expectOne(
      (candidate) => candidate.url === `${environment.apiUrl}${CORROSION_COUPON_CHART_PATH}`,
    );

    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('datasetReleaseId')).toBe('release-1');
    expect(request.request.params.get('tankId')).toBe('TK7311');
    expect(request.request.params.getAll('years')).toEqual(['2025', '2026']);
    expect(request.request.params.getAll('months')).toEqual(['1', '5']);

    request.flush({});
  });

  it('never sends an implicit method, latest release or client-calculated date range', () => {
    service.getChart('release-exact', { tank: null, years: null, months: [] }).subscribe();

    const request = http.expectOne(
      (candidate) => candidate.url === `${environment.apiUrl}${CORROSION_COUPON_CHART_PATH}`,
    );
    expect(request.request.params.keys()).toEqual(['datasetReleaseId']);
    expect(request.request.params.get('datasetReleaseId')).toBe('release-exact');

    request.flush({});
  });
});
