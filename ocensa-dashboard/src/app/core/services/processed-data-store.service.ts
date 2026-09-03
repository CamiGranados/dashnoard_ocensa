import { Injectable, signal, inject } from '@angular/core';
import { FinalTable, FileProcessingResult } from '../models/file-processing.model';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';


@Injectable({ providedIn: 'root' })
export class ProcessedDataStore {

  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  // constructor(private http: HttpClient) {}

  private readonly _result = signal<FileProcessingResult | null>(null);
  readonly result = this._result.asReadonly();

  fileProcessor(files: File[]): Observable<FinalTable> {
    const formData = new FormData();
    files.forEach(file =>{
      formData.append('archivos', file, file.name);
    });
    return this.http.post<FinalTable>(`${this.apiUrl}/LoadFile/procesar/`, formData)
  }

}
