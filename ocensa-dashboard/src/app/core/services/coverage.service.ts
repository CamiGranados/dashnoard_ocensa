import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CoverageMetricResponse } from '../models/coverage.model';
import { DashboardFilters } from './filters-state.service';

export const COVERAGE_METRIC_PATH = '/v1/metrics/THPS.DATA.COVERAGE.V1';

@Injectable({ providedIn: 'root' })
export class CoverageService {
  constructor(private readonly http: HttpClient) {}

  getCoverage(
    datasetReleaseId: string,
    filters: DashboardFilters,
  ): Observable<CoverageMetricResponse> {
    let params = new HttpParams().set('datasetReleaseId', datasetReleaseId);

    if (filters.tank) {
      params = params.set('tankId', filters.tank);
    }
    for (const year of filters.years ?? []) {
      params = params.append('years', year);
    }
    for (const month of filters.months) {
      params = params.append('months', month);
    }

    return this.http.get<CoverageMetricResponse>(
      `${environment.apiUrl}${COVERAGE_METRIC_PATH}`,
      { params },
    );
  }
}
