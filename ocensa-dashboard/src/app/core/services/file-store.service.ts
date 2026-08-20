import { inject, Injectable, signal } from '@angular/core';
import { DatasetReleaseStore } from './dataset-release-store.service';

@Injectable({ providedIn: 'root' })
export class FilesStore {
  private readonly releaseStore = inject(DatasetReleaseStore);
  private readonly _validFiles = signal<File[]>([]);
  readonly validFiles = this._validFiles.asReadonly();

  setFiles(files: File[]): void {
    const snapshot = [...files];
    this._validFiles.set(snapshot);
    this.releaseStore.selectionChanged(snapshot);
  }

  clear(): void {
    this._validFiles.set([]);
    this.releaseStore.selectionChanged([]);
  }
}
