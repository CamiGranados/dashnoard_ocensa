import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ScientificValue } from '../models/dataset-release.model';

export interface Tank {
  id: string;
  name: string;
}

export interface Measurement {
  variable: string;
  numericValue: ScientificValue<number>;
  date: string;
}

@Injectable({ providedIn: 'root' })
export class FiltersService {
    private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getYears(datasetReleaseId: string): Observable<number[]> {
    return this.http.get<number[]>(`${this.apiUrl}/Tanks/years`, {
      params: new HttpParams().set('datasetReleaseId', datasetReleaseId),
    });
  }

  getTanks(datasetReleaseId: string): Observable<Tank[]> {
    return this.http.get<Tank[]>(`${this.apiUrl}/Tanks/listTanks`, {
      params: new HttpParams().set('datasetReleaseId', datasetReleaseId),
    });
  }

  getMeasurements(
    datasetReleaseId: string,
    tankId: string,
    year: number[] = [],
    months: number[] = [],
  ): Observable<Measurement[]> {
    let params = new HttpParams()
      .set('tankId', tankId)
      .set('datasetReleaseId', datasetReleaseId)

    // cada año como parámetro repetido: years=2022&years=2025...
    year.forEach(y => { params = params.append('years', y); });

    // agrega cada mes como parámetro repetido: months=1&months=2...
    months.forEach(m => { params = params.append('months', m); });

    return this.http.get<Measurement[]>(`${this.apiUrl}/Tanks/fwv`, { params });
  }
}
