import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Tank {
  id: string;
  name: string;
}

export interface Measurement {
  variable: string;
  numericValue: number;
  date: string;
}

@Injectable({ providedIn: 'root' })
export class FiltersService {
    private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getYears(): Observable<number[]> {
    return this.http.get<number[]>(`${this.apiUrl}/Tanks/years`);
  }

  getTanks(): Observable<Tank[]> {
    return this.http.get<Tank[]>(`${this.apiUrl}/Tanks/listTanks`);
  }

  getMeasurements(tankId: string, year: number, months: number[] = []): Observable<Measurement[]> {
    let params = new HttpParams()
      .set('tankId', tankId)
      .set('year', year);

    // agrega cada mes como parámetro repetido: months=1&months=2...
    months.forEach(m => { params = params.append('months', m); });

    return this.http.get<Measurement[]>(`${this.apiUrl}/Tanks/fwv`, { params });
  }
}