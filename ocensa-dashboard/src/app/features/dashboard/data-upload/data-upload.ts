import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Button } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { Select } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { Message } from 'primeng/message';
import * as XLSX from 'xlsx';
import { Api } from '../../../core/services/api';
import { FilesStore } from '../../../core/services/file-store.service';
import { ProcessedDataStore } from '../../../core/services/processed-data-store.service';
import { ProcesarArchivosError } from '../../../core/models/procesar-archivos.model';
import { Spinner } from '../../../core/shared/components/spinner/spinner';

interface PreviewColumn {
  field: string;
  header: string;
}

type FileStatus = 'ok' | 'empty' | 'error';

interface FileDataset {
  id: string;
  fileName: string;
  category: string;
  sizeKb: number;
  status: FileStatus;
  errorMessage?: string;
  sheetName: string;
  columns: PreviewColumn[];
  rows: Record<string, string>[];
  totalRows: number;
}

interface RowsOption {
  label: string;
  value: number;
}

const CATEGORY_RULES: { pattern: RegExp; label: string }[] = [
  { pattern: /microbiolog/i, label: 'Microbiología' },
  { pattern: /fisicoqu[ií]m/i, label: 'Fisicoquímica' },
  { pattern: /corros/i, label: 'Corrosión' },
  { pattern: /agua.?libre/i, label: 'Agua libre' },
];

function categoryFromFileName(fileName: string): string {
  return CATEGORY_RULES.find((rule) => rule.pattern.test(fileName))?.label ?? 'Archivo';
}

function datasetId(file: File): string {
  return `${file.name}__${file.size}__${file.lastModified}`;
}

@Component({
  selector: 'app-data-upload',
  imports: [FormsModule, Button, Select, TableModule, Message, Spinner, DialogModule],
  templateUrl: './data-upload.html',
  styleUrl: './data-upload.css',
})
export class DataUpload {
  private readonly filesStore = inject(FilesStore);
  private readonly router = inject(Router);
  private readonly api = inject(Api);
  private readonly processedDataStore = inject(ProcessedDataStore);

  readonly files = this.filesStore.validFiles;
  readonly datasets = signal<FileDataset[]>([]);
  readonly parsing = signal(false);
  readonly processing = signal(false);
  readonly processErrorModalVisible = signal(false);
  readonly processError = signal<ProcesarArchivosError | null>(null);

  readonly rowsOptions: RowsOption[] = [
    { label: '10', value: 10 },
    { label: '20', value: 20 },
    { label: '50', value: 50 },
  ];
  rowsToShow = 10;

  readonly okCount = computed(() => this.datasets().filter((d) => d.status === 'ok').length);
  readonly errorCount = computed(() => this.datasets().filter((d) => d.status === 'error').length);

  constructor() {
    effect(() => {
      const files = this.files();
      untracked(() => this.parseFiles(files));
    });
  }

  private async parseFiles(files: File[]): Promise<void> {
    if (!files.length) {
      this.datasets.set([]);
      return;
    }

    this.parsing.set(true);
    try {
      const parsed = await Promise.all(files.map((file) => this.parseFile(file)));
      this.datasets.set(parsed);
    } finally {
      this.parsing.set(false);
    }
  }

  private async parseFile(file: File): Promise<FileDataset> {
    const base = {
      id: datasetId(file),
      fileName: file.name,
      category: categoryFromFileName(file.name),
      sizeKb: Math.round(file.size / 1024),
    };

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];

      const headerRow = (XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 })[0] ?? []) as string[];
      const dataRows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: '', raw: false });

      const columns: PreviewColumn[] = headerRow.length
        ? headerRow.map((header, index) => ({
            field: header?.toString().trim() || `col_${index}`,
            header: header?.toString().trim() || `Columna ${index + 1}`,
          }))
        : dataRows.length
          ? Object.keys(dataRows[0]).map((field) => ({ field, header: field }))
          : [];

      return {
        ...base,
        status: dataRows.length ? 'ok' : 'empty',
        sheetName,
        columns,
        rows: dataRows,
        totalRows: dataRows.length,
      };
    } catch {
      return {
        ...base,
        status: 'error',
        errorMessage: 'No se pudo leer el archivo. Verifique que no esté dañado o protegido con contraseña.',
        sheetName: '',
        columns: [],
        rows: [],
        totalRows: 0,
      };
    }
  }

  visibleRows(dataset: FileDataset): Record<string, string>[] {
    return dataset.rows.slice(0, this.rowsToShow);
  }

  removeFile(id: string): void {
    this.filesStore.setFiles(this.files().filter((file) => datasetId(file) !== id));
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

    const current = this.files();
    const seen = new Set(current.map((file) => datasetId(file)));
    const merged = [...current];

    for (const file of Array.from(picked)) {
      const id = datasetId(file);
      if (!seen.has(id)) {
        seen.add(id);
        merged.push(file);
      }
    }

    this.filesStore.setFiles(merged);
  }

  cancel(): void {
    this.router.navigate(['/']);
  }

  async proceed(): Promise<void> {
    this.processing.set(true);
    try {
      this.processedDataStore.fileProcessor(this.files()).subscribe({
        next: (data) => {
          const resultado = data
          console.log(resultado)
        },
        error: (err) => {
          console.log(err)
        },
      });
      // const resultado = await this.api.procesarArchivos(this.files());
      // this.processedDataStore.set(resultado);
      this.router.navigate(['/']);
      console.log(this.processedDataStore)
    } catch (err) {
      const httpError = err as HttpErrorResponse;
      const body = httpError.error as ProcesarArchivosError | undefined;
      this.processError.set({
        exito: false,
        mensaje:
          body?.mensaje ??
          'No se pudo conectar con el servidor para procesar los archivos. Verifique la conexión e intente nuevamente.',
        errores: body?.errores ?? [],
      });
      this.processErrorModalVisible.set(true);
    } finally {
      this.processing.set(false);
    }
  }

  closeProcessErrorModal(): void {
    this.processErrorModalVisible.set(false);
  }
}
