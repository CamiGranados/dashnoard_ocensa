import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { H08DistributionResponse } from '../models/h08-distribution.model';
import { DashboardFilters } from './filters-state.service';

export const H08_DISTRIBUTION_PATH = '/v1/charts/H08';

@Injectable({ providedIn: 'root' })
export class H08DistributionService {
  constructor(private readonly http: HttpClient) {}

  getDistribution(
    datasetReleaseId: string,
    filters: DashboardFilters,
  ): Observable<H08DistributionResponse> {
    let params = new HttpParams().set('datasetReleaseId', datasetReleaseId);

    if (filters.tank) params = params.set('tankId', filters.tank);
    for (const year of filters.years ?? []) params = params.append('years', year);
    for (const month of filters.months) params = params.append('months', month);

    return this.http.get<H08DistributionResponse>(`${environment.apiUrl}${H08_DISTRIBUTION_PATH}`, {
      params,
    });
  }
}
