import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ProcesarArchivosResultado } from '../models/procesar-archivos.model';

@Injectable({
  providedIn: 'root',
})
export class Api {
  private readonly http = inject(HttpClient);

  procesarArchivos(files: File[]): Promise<ProcesarArchivosResultado> {
    const formData = new FormData();
    for (const file of files) {
      formData.append('archivos', file, file.name);
    }

    return firstValueFrom(
      this.http.post<ProcesarArchivosResultado>(`${environment.apiUrl}/LoadFile/procesar`, formData),
    );
  }
}
