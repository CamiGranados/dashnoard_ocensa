import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class FilesStore {
  private readonly _validFiles = signal<File[]>([]);
  readonly validFiles = this._validFiles.asReadonly();

  setFiles(files: File[]): void {
    this._validFiles.set(files);
  }

  clear(): void {
    this._validFiles.set([]);
  }
}