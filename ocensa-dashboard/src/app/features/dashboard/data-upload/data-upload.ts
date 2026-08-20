import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Button } from 'primeng/button';
import { Message } from 'primeng/message';
import {
  MAX_IMPORT_FILES,
  validateImportSelection,
} from '../../../core/models/dataset-release.model';
import { Api, classifyImportFailure } from '../../../core/services/api';
import { DatasetReleaseStore } from '../../../core/services/dataset-release-store.service';
import { FilesStore } from '../../../core/services/file-store.service';
import { Spinner } from '../../../core/shared/components/spinner/spinner';

function fileId(file: File): string {
  return `${file.name}__${file.size}__${file.lastModified}`;
}

@Component({
  selector: 'app-data-upload',
  imports: [Button, Message, Spinner],
  templateUrl: './data-upload.html',
  styleUrl: './data-upload.css',
})
export class DataUpload {
  private readonly filesStore = inject(FilesStore);
  private readonly router = inject(Router);
  private readonly api = inject(Api);
  private readonly releaseStore = inject(DatasetReleaseStore);

  readonly maxFiles = MAX_IMPORT_FILES;
  readonly files = this.filesStore.validFiles;
  readonly processing = signal(false);
  readonly importState = this.releaseStore.importState;
  readonly release = this.releaseStore.release;
  readonly validation = computed(() => validateImportSelection(this.files()));
  readonly totalMiB = computed(() => this.validation().totalBytes / (1024 * 1024));

  fileId(file: File): string {
    return fileId(file);
  }

  fileSizeMiB(file: File): string {
    return (file.size / (1024 * 1024)).toFixed(2);
  }

  removeFile(id: string): void {
    this.filesStore.setFiles(this.files().filter((file) => fileId(file) !== id));
  }

  clearFiles(): void {
    this.filesStore.clear();
  }

  addFiles(input: HTMLInputElement): void {
    input.value = '';
    input.click();
  }

  onFilesPicked(event: Event): void {
    const picked = (event.target as HTMLInputElement).files;
    if (!picked?.length) return;

    const merged = [...this.files(), ...Array.from(picked)].slice(0, this.maxFiles);
    this.filesStore.setFiles(merged);
  }

  cancel(): void {
    this.router.navigate(['/']);
  }

  async proceed(): Promise<void> {
    const files = this.files();
    const validation = validateImportSelection(files);
    if (!validation.valid) {
      this.releaseStore.failImport({
        kind: 'error',
        code: 'IMPORT_SELECTION_INVALID',
        message: validation.errors.join(' '),
      });
      return;
    }

    this.processing.set(true);
    this.releaseStore.beginImport();
    try {
      const response = await this.api.preflightImport(files);
      this.releaseStore.completeImport(response);
      if (this.releaseStore.hasPublishedRelease()) {
        await this.router.navigate(['/']);
      }
    } catch (error) {
      this.releaseStore.failImport(classifyImportFailure(error));
    } finally {
      this.processing.set(false);
    }
  }
}
