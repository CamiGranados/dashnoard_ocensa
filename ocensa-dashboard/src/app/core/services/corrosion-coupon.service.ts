import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CorrosionCouponResponse } from '../models/corrosion-coupon.model';
import { DashboardFilters } from './filters-state.service';

export const CORROSION_COUPON_CHART_PATH = '/v1/charts/H10-COR-COUPON.V1';

@Injectable({ providedIn: 'root' })
export class CorrosionCouponService {
  constructor(private readonly http: HttpClient) {}

  getChart(
    datasetReleaseId: string,
    filters: DashboardFilters,
  ): Observable<CorrosionCouponResponse> {
    let params = new HttpParams().set('datasetReleaseId', datasetReleaseId);

    if (filters.tank) params = params.set('tankId', filters.tank);
    for (const year of filters.years ?? []) params = params.append('years', year);
    for (const month of filters.months) params = params.append('months', month);

    return this.http.get<CorrosionCouponResponse>(
      `${environment.apiUrl}${CORROSION_COUPON_CHART_PATH}`,
      { params },
    );
  }
}
