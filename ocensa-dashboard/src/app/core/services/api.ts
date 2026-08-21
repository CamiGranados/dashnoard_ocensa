import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ImportBatchResponse,
  ImportFailure,
} from '../models/dataset-release.model';

@Injectable({
  providedIn: 'root',
})
export class Api {
  private readonly http = inject(HttpClient);

  preflightImport(files: readonly File[]): Promise<ImportBatchResponse> {
    const formData = new FormData();
    const [file] = files;
    if (!file || files.length !== 1) {
      return Promise.reject(new Error('El contrato de importación requiere exactamente un archivo.'));
    }
    formData.append('file', file, file.name);

    return firstValueFrom(
      this.http.post<ImportBatchResponse>(`${environment.apiUrl}/v1/import-batches`, formData),
    );
  }
}

export function classifyImportFailure(error: unknown): ImportFailure {
  if (!(error instanceof HttpErrorResponse)) {
    return {
      kind: 'error',
      code: 'IMPORT_NETWORK_ERROR',
      message: 'No fue posible completar la comunicación con el servicio de importación.',
    };
  }

  const body = error.error as
    | {
        code?: string;
        message?: string;
        title?: string;
        importBatchId?: string;
        release?: { releaseIdentity?: string } | null;
        importBatch?: { batchIdentity?: string };
        blockedRelease?: { releaseIdentity?: string } | null;
      }
    | null;
  const message = body?.message ?? body?.title;
  const diagnostics = {
    importBatchId: body?.importBatchId ?? body?.importBatch?.batchIdentity ?? null,
    releaseIdentity:
      body?.release?.releaseIdentity ?? body?.blockedRelease?.releaseIdentity ?? null,
  };

  if (error.status === 410) {
    return {
      kind: 'retired',
      code: body?.code ?? 'LEGACY_IMPORT_RETIRED',
      message: message ?? 'El importador solicitado fue retirado. Actualice el cliente antes de reintentar.',
      ...diagnostics,
    };
  }

  if (error.status === 503) {
    const code = body?.code ?? 'IMPORT_STORAGE_NOT_READY';
    const operationalHint =
      code === 'IMPORT_STORAGE_NOT_READY'
        ? ' En desarrollo local, reinicie la API con el perfil local-analytics después de configurar SQL Server y aplicar la migración.'
        : code === 'IMPORT_STORAGE_UNAVAILABLE'
          ? ' Verifique que SQL Server esté disponible y que la migración raw/release haya sido aplicada.'
          : '';
    return {
      kind: 'blocked',
      code,
      message:
        (message ??
          'El almacenamiento trazable todavía no está habilitado. El lote no fue publicado y no se muestran resultados.') +
        operationalHint,
      ...diagnostics,
    };
  }

  return {
    kind: 'error',
    code: body?.code ?? `IMPORT_HTTP_${error.status || 0}`,
    message: message ?? 'El servidor rechazó la importación. No se conservaron resultados anteriores.',
    ...diagnostics,
  };
}
