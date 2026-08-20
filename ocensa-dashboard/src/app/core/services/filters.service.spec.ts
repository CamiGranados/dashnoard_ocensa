import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { FiltersService, validateAnalysisFilterOptions } from './filters.service';

describe('FiltersService', () => {
  let service: FiltersService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(FiltersService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads queryable-release filters from the versioned endpoint', () => {
    service.getAnalysisFilterOptions('release/uat 1').subscribe();

    const request = http.expectOne(
      `${environment.apiUrl}/v1/dataset-releases/release%2Fuat%201/filter-options`,
    );
    expect(request.request.method).toBe('GET');
    request.flush({ datasetReleaseId: 'release/uat 1', tanks: [], years: [] });
  });
});

describe('validateAnalysisFilterOptions', () => {
  it('accepts an exact, deterministic filter catalog for the requested release', () => {
    expect(
      validateAnalysisFilterOptions(
        {
          datasetReleaseId: 'release-1',
          tanks: [
            { id: 'TK7311', name: 'TK7311' },
            { id: 'TK7313', name: 'TK7313' },
            { id: 'TQ55000', name: 'TQ55000' },
          ],
          years: [2021, 2025, 2026],
        },
        'release-1',
      ),
    ).toEqual([]);
  });

  it('rejects release mismatch, malformed arrays and non-canonical tank metadata', () => {
    expect(
      validateAnalysisFilterOptions(
        { datasetReleaseId: 'release-other', tanks: 'TK7311', years: null },
        'release-1',
      ).map((issue) => issue.code),
    ).toEqual(
      expect.arrayContaining(['FILTER_OPTIONS_RELEASE_MISMATCH', 'FILTER_OPTIONS_SHAPE_INVALID']),
    );

    expect(
      validateAnalysisFilterOptions(
        {
          datasetReleaseId: 'release-1',
          tanks: [{ id: ' TK7311', name: 'TK7311' }],
          years: [],
        },
        'release-1',
      ).map((issue) => issue.code),
    ).toContain('FILTER_OPTION_TANK_INVALID');

    expect(
      validateAnalysisFilterOptions(
        {
          datasetReleaseId: 'release-1',
          tanks: [{ id: 'TK7311', name: 'Tanque seguro' }],
          years: [],
        },
        'release-1',
      ).map((issue) => issue.code),
    ).toContain('FILTER_OPTION_TANK_INVALID');
  });

  it('rejects duplicate or case-ambiguous tank ids and non-deterministic ordering', () => {
    const issues = validateAnalysisFilterOptions(
      {
        datasetReleaseId: 'release-1',
        tanks: [
          { id: 'tk7311', name: 'tk7311' },
          { id: 'TK7311', name: 'TK7311' },
          { id: 'TK7311', name: 'TK7311' },
        ],
        years: [],
      },
      'release-1',
    ).map((issue) => issue.code);

    expect(issues).toEqual(
      expect.arrayContaining([
        'FILTER_OPTION_TANK_AMBIGUOUS',
        'FILTER_OPTION_TANK_DUPLICATE',
        'FILTER_OPTION_TANK_ORDER_INVALID',
      ]),
    );
  });

  it('rejects years outside range, duplicates and descending order', () => {
    const issues = validateAnalysisFilterOptions(
      {
        datasetReleaseId: 'release-1',
        tanks: [],
        years: [2026, 2025, 2025, 1899, '2024'],
      },
      'release-1',
    ).map((issue) => issue.code);

    expect(issues).toEqual(
      expect.arrayContaining([
        'FILTER_OPTION_YEAR_INVALID',
        'FILTER_OPTION_YEAR_DUPLICATE',
        'FILTER_OPTION_YEAR_ORDER_INVALID',
      ]),
    );
  });
});
