import { computed, Injectable, signal } from '@angular/core';
import {
  DatasetRelease,
  ImportBatchResponse,
  ImportFailure,
  ImportUiState,
  SelectedFileMetadata,
} from '../models/dataset-release.model';

const INITIAL_STATE: ImportUiState = {
  kind: 'idle',
  message: 'No hay un dataset publicado en esta sesión.',
};

@Injectable({ providedIn: 'root' })
export class DatasetReleaseStore {
  private readonly _release = signal<DatasetRelease | null>(null);
  private readonly _importState = signal<ImportUiState>(INITIAL_STATE);
  private readonly _selectedFiles = signal<SelectedFileMetadata[]>([]);

  readonly release = this._release.asReadonly();
  readonly importState = this._importState.asReadonly();
  readonly selectedFiles = this._selectedFiles.asReadonly();
  readonly hasPublishedRelease = computed(
    () => this._release()?.status === 'published' && !!this._release()?.releaseId,
  );
  readonly releaseId = computed(() =>
    this.hasPublishedRelease() ? (this._release()?.releaseId ?? null) : null,
  );
  readonly gateMessage = computed(() => {
    const state = this._importState();
    if (state.kind === 'uploading') return 'La importación está en validación; todavía no existe un release publicable.';
    if (state.kind === 'published') return '';
    return state.message || 'No existe un release publicado y trazable.';
  });

  selectionChanged(files: readonly File[]): void {
    this._selectedFiles.set(
      files.map(({ name, size, lastModified }) => ({ name, size, lastModified })),
    );
    this._release.set(null);
    this._importState.set({
      kind: 'selection_changed',
      code: 'DATASET_SELECTION_CHANGED',
      message: files.length
        ? 'La selección cambió. Los resultados anteriores fueron invalidados hasta publicar el nuevo dataset.'
        : 'La selección se vació. No hay resultados publicados para mostrar.',
    });
  }

  beginImport(): void {
    this._release.set(null);
    this._importState.set({
      kind: 'uploading',
      code: 'IMPORT_PREFLIGHT_RUNNING',
      message: 'El servidor está verificando el lote. No se publican resultados durante el preflight.',
    });
  }

  completeImport(response: ImportBatchResponse): void {
    const wireRelease = response.release;
    const isValidPublishedRelease =
      response.status === 'published' &&
      response.persistenceEnabled === true &&
      response.publicationEnabled === true &&
      response.importBatch.state === 'published' &&
      wireRelease?.state === 'published' &&
      !!wireRelease?.releaseIdentity &&
      !!wireRelease?.sourceFileSha256 &&
      !!wireRelease?.classifierVersion &&
      !!wireRelease?.approvedAtUtc;

    if (!isValidPublishedRelease) {
      this._release.set(null);
      this._importState.set({
        kind: 'blocked',
        code: response.code || 'IMPORT_NOT_PUBLISHED',
        importBatchId: response.importBatchId || response.importBatch.batchIdentity,
        releaseIdentity:
          response.blockedRelease?.releaseIdentity ?? response.release?.releaseIdentity ?? null,
        message:
          response.message ||
          'El servidor recibió el lote, pero no emitió un release publicado. Los resultados permanecen bloqueados.',
      });
      return;
    }

    const release: DatasetRelease = {
      releaseId: wireRelease.releaseIdentity,
      status: 'published',
      publishedAt: wireRelease.approvedAtUtc!,
      sourceSha256: wireRelease.sourceFileSha256,
      classifierVersion: wireRelease.classifierVersion,
      recordCount: wireRelease.recordCount ?? null,
    };
    this._release.set(release);
    this._importState.set({
      kind: 'published',
      code: response.code || 'DATASET_RELEASE_PUBLISHED',
      importBatchId: response.importBatchId || response.importBatch.batchIdentity,
      releaseIdentity: wireRelease.releaseIdentity,
      message: response.message || 'Dataset publicado y listo para consulta.',
    });
  }

  failImport(failure: ImportFailure): void {
    this._release.set(null);
    this._importState.set({
      kind: failure.kind,
      code: failure.code,
      message: failure.message,
      importBatchId: failure.importBatchId,
      releaseIdentity: failure.releaseIdentity,
    });
  }

  invalidateForQueryFailure(): void {
    this._release.set(null);
    this._importState.set({
      kind: 'blocked',
      code: 'RELEASE_QUERY_FAILED',
      message: 'No fue posible demostrar la identidad del release. Se ocultaron todos los resultados.',
    });
  }
}
