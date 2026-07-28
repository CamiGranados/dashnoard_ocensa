import { Injectable, signal, inject } from '@angular/core';
import { FinalTable, ProcesarArchivosResultado } from '../models/procesar-archivos.model';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';


@Injectable({ providedIn: 'root' })
export class ProcessedDataStore {

  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  // constructor(private http: HttpClient) {}

  private readonly _result = signal<ProcesarArchivosResultado | null>(null);
  readonly result = this._result.asReadonly();

  // set(result: ProcesarArchivosResultado): void {
  //   this._result.set(result);
  // }

  // clear(): void {
  //   this._result.set(null);
  // }

  fileProcessor(files: File[]): Observable<FinalTable> {
    const formData = new FormData();
    files.forEach(file =>{
      formData.append('archivos', file, file.name);
    });
    return this.http.post<FinalTable>(`${this.apiUrl}/LoadFile/procesar/`, formData)
  }

}
