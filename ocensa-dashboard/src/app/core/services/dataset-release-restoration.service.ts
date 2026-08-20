import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, firstValueFrom, map, of, tap, timeout } from 'rxjs';
import { DatasetReleaseMetadataService } from './dataset-release-metadata.service';
import { DatasetReleaseStore } from './dataset-release-store.service';

const PERMANENT_RESTORATION_CODES = new Set([
  'DATASET_RELEASE_NOT_FOUND',
  'DEVELOPMENT_RELEASE_IDENTITY_MISMATCH',
  'DEVELOPMENT_RELEASE_STORAGE_INCONSISTENT',
  'DEVELOPMENT_RELEASE_STATE_INCONSISTENT',
  'UAT_RELEASE_IDENTITY_MISMATCH',
  'STALE_RESULT',
]);

function errorBody(error: HttpErrorResponse): Record<string, unknown> {
  return typeof error.error === 'object' && error.error !== null
    ? (error.error as Record<string, unknown>)
    : {};
}

export function isPermanentRestorationFailure(error: unknown): boolean {
  if (!(error instanceof HttpErrorResponse)) return false;
  if (error.status === 404 || error.status === 410) return true;
  return PERMANENT_RESTORATION_CODES.has(String(errorBody(error)['code'] ?? ''));
}

function restorationFailureMessage(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) {
    return 'No fue posible volver a verificar el release en esta carga. No se muestran resultados anteriores.';
  }
  const body = errorBody(error);
  const serverMessage =
    typeof body['message'] === 'string'
      ? body['message']
      : typeof body['detail'] === 'string'
        ? body['detail']
        : null;
  return (
    serverMessage ??
    'No fue posible volver a verificar el release en esta carga. No se muestran resultados anteriores.'
  );
}

@Injectable({ providedIn: 'root' })
export class DatasetReleaseRestorationService {
  private restoration: Promise<void> | null = null;

  constructor(
    private readonly metadataService: DatasetReleaseMetadataService,
    private readonly releaseStore: DatasetReleaseStore,
  ) {}

  restore(): Promise<void> {
    if (this.restoration) return this.restoration;

    const candidate = this.releaseStore.readApprovedUatCandidate();
    if (!candidate) {
      this.restoration = Promise.resolve();
      return this.restoration;
    }

    const snapshot = this.releaseStore.restorationSnapshot();
    this.restoration = firstValueFrom(
      this.metadataService.getExactRelease(candidate).pipe(
        timeout({ first: 8_000 }),
        tap((metadata) => {
          this.releaseStore.restoreApprovedUat(candidate, metadata, snapshot);
        }),
        map(() => undefined),
        catchError((error: unknown) => {
          const message = restorationFailureMessage(error);
          if (isPermanentRestorationFailure(error)) {
            this.releaseStore.rejectRestorationCandidate(
              snapshot,
              'RELEASE_RESTORE_CANDIDATE_REJECTED',
              message,
            );
          } else {
            this.releaseStore.deferRestoration(snapshot, message);
          }
          return of(undefined);
        }),
      ),
    );
    return this.restoration;
  }
}
