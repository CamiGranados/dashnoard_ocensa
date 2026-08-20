import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ScientificValue } from '../models/dataset-release.model';

/** Wire shape retained only so the unreachable legacy component can compile. */
export interface LegacyMeasurement {
  variable: string;
  numericValue: ScientificValue<number>;
  date: string;
}

/**
 * Quarantined dependency of the retired FWV view. No active route imports this
 * service; all current dashboard filters use the versioned release endpoint.
 */
@Injectable({ providedIn: 'root' })
export class LegacyMeasurementsService {
  constructor(private readonly http: HttpClient) {}

  getMeasurements(
    datasetReleaseId: string,
    tankId: string,
    years: number[] = [],
    months: number[] = [],
  ): Observable<LegacyMeasurement[]> {
    let params = new HttpParams().set('tankId', tankId).set('datasetReleaseId', datasetReleaseId);
    for (const year of years) params = params.append('years', year);
    for (const month of months) params = params.append('months', month);

    return this.http.get<LegacyMeasurement[]>(`${environment.apiUrl}/Tanks/fwv`, { params });
  }
}
