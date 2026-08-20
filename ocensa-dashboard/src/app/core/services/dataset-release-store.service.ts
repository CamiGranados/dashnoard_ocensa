import { computed, inject, Injectable, signal } from '@angular/core';
import {
  DatasetRelease,
  DatasetReleaseMetadataResponse,
  ImportBatchResponse,
  ImportFailure,
  ImportUiState,
  SelectedFileMetadata,
  isCanonicalSha256,
  validateApprovedUatMetadata,
} from '../models/dataset-release.model';
import { RELEASE_SESSION_STORAGE } from './release-session-storage.token';

export const APPROVED_UAT_RELEASE_SESSION_KEY = 'thps.approved_uat.release_identity.v1';
export type ReleaseRestorationDecision = 'restored' | 'invalid' | 'superseded';

const INITIAL_STATE: ImportUiState = {
  kind: 'idle',
  message: 'No hay un dataset publicado en esta sesión.',
};

@Injectable({ providedIn: 'root' })
export class DatasetReleaseStore {
  private readonly sessionStorage = inject(RELEASE_SESSION_STORAGE);
  private readonly _release = signal<DatasetRelease | null>(null);
  private readonly _importState = signal<ImportUiState>(INITIAL_STATE);
  private readonly _selectedFiles = signal<SelectedFileMetadata[]>([]);
  private transitionEpoch = 0;

  readonly release = this._release.asReadonly();
  readonly importState = this._importState.asReadonly();
  readonly selectedFiles = this._selectedFiles.asReadonly();
  readonly hasPublishedRelease = computed(
    () =>
      this._release()?.status === 'published' &&
      this._release()?.isPublished === true &&
      !!this._release()?.releaseId,
  );
  readonly releaseId = computed(() =>
    this.hasPublishedRelease() ? (this._release()?.releaseId ?? null) : null,
  );
  readonly hasQueryableRelease = computed(() => {
    const release = this._release();
    return (
      !!release?.releaseId &&
      release.analyticsReadEnabled === true &&
      (release.status === 'approved_uat' || this.hasPublishedRelease())
    );
  });
  readonly analysisReleaseId = computed(() =>
    this.hasQueryableRelease() ? (this._release()?.releaseId ?? null) : null,
  );
  readonly isDevelopmentAnalysis = computed(
    () => this._release()?.status === 'approved_uat' && this.hasQueryableRelease(),
  );
  readonly gateMessage = computed(() => {
    const state = this._importState();
    if (state.kind === 'uploading')
      return 'La importación está en validación; todavía no existe un release publicable.';
    if (state.kind === 'published') return '';
    if (state.kind === 'approved_uat') {
      return 'Desarrollo · descriptivo provisional. Los módulos legados permanecen bloqueados.';
    }
    return state.message || 'No existe un release publicado y trazable.';
  });

  selectionChanged(files: readonly File[]): void {
    this.advanceTransition();
    this.clearApprovedUatCandidate();
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
    this.advanceTransition();
    this.clearApprovedUatCandidate();
    this._release.set(null);
    this._importState.set({
      kind: 'uploading',
      code: 'IMPORT_PREFLIGHT_RUNNING',
      message:
        'El servidor está verificando el lote. No se publican resultados durante el preflight.',
    });
  }

  completeImport(response: ImportBatchResponse): void {
    this.advanceTransition();
    const wireRelease = response.release;
    const isValidPublishedRelease =
      response.status === 'published' &&
      response.persistenceEnabled === true &&
      response.publicationEnabled === true &&
      response.analyticsReadEnabled === true &&
      response.published === true &&
      response.importBatch.state === 'stored' &&
      wireRelease?.state === 'published' &&
      wireRelease.isPublished === true &&
      !!wireRelease?.releaseIdentity &&
      !!wireRelease?.sourceFileSha256 &&
      !!wireRelease?.classifierVersion &&
      !!wireRelease?.approvedAtUtc;

    const isValidUatRelease =
      response.status === 'approved_uat' &&
      response.persistenceEnabled === true &&
      response.publicationEnabled === false &&
      response.analyticsReadEnabled === true &&
      response.published === false &&
      response.importBatch.state === 'stored' &&
      wireRelease?.state === 'approved' &&
      wireRelease.isPublished === false &&
      isCanonicalSha256(response.importBatchId) &&
      isCanonicalSha256(response.importBatch.batchIdentity) &&
      response.importBatchId === response.importBatch.batchIdentity &&
      isCanonicalSha256(wireRelease.releaseIdentity) &&
      isCanonicalSha256(wireRelease.sourceBatchIdentity) &&
      wireRelease.sourceBatchIdentity === response.importBatch.batchIdentity &&
      isCanonicalSha256(wireRelease.sourceFileSha256) &&
      wireRelease.sourceFileSha256 === response.importBatch.fileSha256 &&
      wireRelease.schemaVersion === response.importBatch.schemaVersion &&
      wireRelease.classifierVersion === response.importBatch.classifierVersion &&
      !!wireRelease.classifierVersion &&
      !!wireRelease.approvedBy &&
      !!wireRelease.approvedAtUtc &&
      Number.isFinite(Date.parse(wireRelease.approvedAtUtc));

    if (!isValidPublishedRelease && !isValidUatRelease) {
      this.clearApprovedUatCandidate();
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

    if (isValidUatRelease) {
      const release: DatasetRelease = {
        releaseId: wireRelease.releaseIdentity,
        status: 'approved_uat',
        publishedAt: null,
        approvedAt: wireRelease.approvedAtUtc!,
        isPublished: false,
        analyticsReadEnabled: true,
        sourceSha256: wireRelease.sourceFileSha256,
        classifierVersion: wireRelease.classifierVersion,
        storedRawCellCount: null,
      };
      this._release.set(release);
      this.rememberApprovedUatCandidate(wireRelease.releaseIdentity);
      this._importState.set({
        kind: 'approved_uat',
        code: response.code || 'DATASET_RELEASE_APPROVED_UAT',
        importBatchId: response.importBatchId || response.importBatch.batchIdentity,
        releaseIdentity: wireRelease.releaseIdentity,
        message:
          response.message || 'Desarrollo · descriptivo provisional. No es un release publicado.',
      });
      return;
    }

    const release: DatasetRelease = {
      releaseId: wireRelease.releaseIdentity,
      status: 'published',
      publishedAt: wireRelease.approvedAtUtc!,
      approvedAt: wireRelease.approvedAtUtc!,
      isPublished: true,
      analyticsReadEnabled: true,
      sourceSha256: wireRelease.sourceFileSha256,
      classifierVersion: wireRelease.classifierVersion,
      storedRawCellCount: null,
    };
    this.clearApprovedUatCandidate();
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
    this.advanceTransition();
    this.clearApprovedUatCandidate();
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
    this.advanceTransition();
    this.clearApprovedUatCandidate();
    this._release.set(null);
    this._importState.set({
      kind: 'blocked',
      code: 'RELEASE_QUERY_FAILED',
      message:
        'No fue posible demostrar la identidad del release. Se ocultaron todos los resultados.',
    });
  }

  restorationSnapshot(): number {
    return this.transitionEpoch;
  }

  readApprovedUatCandidate(): string | null {
    if (!this.sessionStorage) return null;
    try {
      const candidate = this.sessionStorage.getItem(APPROVED_UAT_RELEASE_SESSION_KEY);
      if (!candidate) return null;
      if (!isCanonicalSha256(candidate)) {
        this.sessionStorage.removeItem(APPROVED_UAT_RELEASE_SESSION_KEY);
        return null;
      }
      return candidate;
    } catch {
      return null;
    }
  }

  restoreApprovedUat(
    candidate: string,
    wireMetadata: unknown,
    snapshot: number,
  ): ReleaseRestorationDecision {
    if (!this.canApplyRestoration(snapshot)) return 'superseded';

    const issues = validateApprovedUatMetadata(candidate, wireMetadata);
    if (issues.length) {
      this.advanceTransition();
      this.clearApprovedUatCandidate();
      this._release.set(null);
      this._importState.set({
        kind: 'blocked',
        code: 'RELEASE_RESTORE_METADATA_INVALID',
        releaseIdentity: candidate,
        message:
          'La metadata no volvió a demostrar la aprobación exacta del release. Los resultados permanecen bloqueados.',
      });
      return 'invalid';
    }

    const metadata = wireMetadata as DatasetReleaseMetadataResponse;

    this.advanceTransition();
    this._release.set({
      releaseId: metadata.releaseIdentity,
      status: 'approved_uat',
      publishedAt: null,
      approvedAt: metadata.approvedAtUtc!,
      isPublished: false,
      analyticsReadEnabled: true,
      sourceSha256: metadata.fileSha256,
      classifierVersion: metadata.classifierVersion,
      storedRawCellCount: metadata.storedRawCellCount,
    });
    this._importState.set({
      kind: 'approved_uat',
      code: 'DATASET_RELEASE_RESTORED_UAT',
      importBatchId: metadata.importBatchId,
      releaseIdentity: metadata.releaseIdentity,
      message:
        'Desarrollo · descriptivo provisional. La API volvió a demostrar la identidad y aprobación del release.',
    });
    this.rememberApprovedUatCandidate(metadata.releaseIdentity);
    return 'restored';
  }

  rejectRestorationCandidate(snapshot: number, code: string, message: string): boolean {
    if (!this.canApplyRestoration(snapshot)) return false;
    this.advanceTransition();
    this.clearApprovedUatCandidate();
    this._release.set(null);
    this._importState.set({
      kind: 'blocked',
      code,
      message,
    });
    return true;
  }

  deferRestoration(snapshot: number, message: string): boolean {
    if (!this.canApplyRestoration(snapshot)) return false;
    this.advanceTransition();
    this._release.set(null);
    this._importState.set({
      kind: 'error',
      code: 'RELEASE_RESTORE_TRANSIENT_FAILURE',
      message,
    });
    return true;
  }

  private canApplyRestoration(snapshot: number): boolean {
    return (
      snapshot === this.transitionEpoch &&
      this._release() === null &&
      this._selectedFiles().length === 0 &&
      this._importState().kind === 'idle'
    );
  }

  private advanceTransition(): void {
    this.transitionEpoch += 1;
  }

  private rememberApprovedUatCandidate(releaseIdentity: string): void {
    if (!this.sessionStorage || !isCanonicalSha256(releaseIdentity)) return;
    try {
      this.sessionStorage.setItem(APPROVED_UAT_RELEASE_SESSION_KEY, releaseIdentity);
    } catch {
      // The in-memory release remains usable; unavailable storage disables restoration only.
    }
  }

  private clearApprovedUatCandidate(): void {
    if (!this.sessionStorage) return;
    try {
      this.sessionStorage.removeItem(APPROVED_UAT_RELEASE_SESSION_KEY);
    } catch {
      // Storage may be unavailable in SSR, privacy modes or constrained browsers.
    }
  }
}
