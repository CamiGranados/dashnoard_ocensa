import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DatasetReleaseMetadataResponse } from '../models/dataset-release.model';

@Injectable({ providedIn: 'root' })
export class DatasetReleaseMetadataService {
  constructor(private readonly http: HttpClient) {}

  getExactRelease(releaseIdentity: string): Observable<DatasetReleaseMetadataResponse> {
    return this.http.get<DatasetReleaseMetadataResponse>(
      `${environment.apiUrl}/v1/dataset-releases/${encodeURIComponent(releaseIdentity)}`,
    );
  }
}
