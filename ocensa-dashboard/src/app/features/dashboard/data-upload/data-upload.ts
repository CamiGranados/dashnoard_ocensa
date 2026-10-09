import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Button } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { Select } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { Message } from 'primeng/message';
import * as XLSX from 'xlsx';
import { FilesStore } from '../../../core/services/file-store.service';
import { ProcessedDataStore } from '../../../core/services/processed-data-store.service';
import { FileProcessingError } from '../../../core/models/file-processing.model';
import { BiocideControlService } from '../../../core/services/biocide-control.service';
import { BiocideEfficacyService } from '../../../core/services/biocide-efficacy.service';
import { MicrobiologyService } from '../../../core/services/microbiology.service';
import { OverviewService } from '../../../core/services/overview.service';
import { PhysicochemistryService } from '../../../core/services/physicochemistry.service';
import { ThpsReviewService } from '../../../core/services/thps-review.service';
import { Spinner } from '../../../shared/components/spinner/spinner';
import {
  PreviewColumn,
  categoryFromColumns,
  formatPreviewCell,
  keyColumns,
} from './preview-format';

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

const DATA_SHEET_RE = /^datos$/i;

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
  private readonly processedDataStore = inject(ProcessedDataStore);
  // Servicios con httpResource en root: conservan la última respuesta, hay que recargarlos.
  private readonly resources = [
    inject(OverviewService).summary,
    inject(MicrobiologyService).review,
    inject(PhysicochemistryService).review,
    inject(ThpsReviewService).review,
    inject(BiocideControlService).review,
    inject(BiocideEfficacyService).review,
  ];

  readonly files = this.filesStore.validFiles;
  readonly datasets = signal<FileDataset[]>([]);
  readonly parsing = signal(false);
  readonly processing = signal(false);
  readonly maxFiles = 5;
  readonly maxFilesModalVisible = signal(false);
  readonly acceptedNames = signal<string[]>([]);
  readonly rejectedNames = signal<string[]>([]);
  private readonly filesSection = viewChild<ElementRef<HTMLElement>>('filesSection');

  readonly limitUsagePercent = computed(() =>
    Math.round((Math.min(this.acceptedNames().length, this.maxFiles) / this.maxFiles) * 100),
  );
  /** Porcentaje del relleno verde: todo menos el último archivo, que se pinta ámbar. */
  readonly limitPreviousPercent = computed(() =>
    Math.max(0, ((this.acceptedNames().length - 1) / this.maxFiles) * 100),
  );
  readonly limitAuditRows = computed(() => [
    ...this.acceptedNames().map((name) => ({ name, rejected: false })),
    ...this.rejectedNames().map((name) => ({ name, rejected: true })),
  ]);
  readonly processErrorModalVisible = signal(false);
  readonly processError = signal<FileProcessingError | null>(null);

  readonly rowsOptions: RowsOption[] = [
    { label: '10', value: 10 },
    { label: '20', value: 20 },
    { label: '50', value: 50 },
  ];
  rowsToShow = 10;

  readonly detailDataset = signal<FileDataset | null>(null);

  readonly cards = computed(() =>
    this.datasets().map((dataset) => ({ dataset, columns: keyColumns(dataset.columns) })),
  );

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
      const sheetName =
        workbook.SheetNames.find((name) => DATA_SHEET_RE.test(name.trim())) ??
        workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];

      const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
        header: 1,
        defval: '',
        raw: false,
      });
      // La plantilla trae un título en la fila 1: el encabezado es la primera fila con ≥3 celdas.
      const headerIndex = Math.max(
        0,
        matrix.findIndex((row) => row.filter((cell) => String(cell).trim() !== '').length >= 3),
      );
      const headerRow = matrix[headerIndex] ?? [];

      const columns: PreviewColumn[] = [];
      const columnIndexes: number[] = [];
      headerRow.forEach((cell, index) => {
        const header = String(cell ?? '').trim();
        if (!header) return;
        columns.push({ field: header, header });
        columnIndexes.push(index);
      });

      const dataRows = matrix
        .slice(headerIndex + 1)
        .map((row) =>
          Object.fromEntries(
            columns.map((col, i) => [col.field, String(row[columnIndexes[i]] ?? '')]),
          ),
        )
        .filter((row) => Object.values(row).some((value) => value.trim() !== ''));

      return {
        ...base,
        category: base.category === 'Archivo' ? (categoryFromColumns(columns) ?? 'Archivo') : base.category,
        status: dataRows.length ? 'ok' : 'empty',
        sheetName,
        columns,
        rows: dataRows,
        totalRows: dataRows.length,
      };
    } catch (err) {
      console.error('Error leyendo', file.name, err);
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

  formatCell(field: string, value: unknown): string {
    return formatPreviewCell(field, value);
  }

  openDetail(dataset: FileDataset): void {
    this.detailDataset.set(dataset);
  }

  onDetailVisibleChange(visible: boolean): void {
    if (!visible) this.detailDataset.set(null);
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

    const rejected: string[] = [];

    for (const file of Array.from(picked)) {
      const id = datasetId(file);
      if (seen.has(id)) continue;
      if (merged.length >= this.maxFiles) {
        rejected.push(file.name);
        continue;
      }
      seen.add(id);
      merged.push(file);
    }

    this.filesStore.setFiles(merged);

    if (rejected.length) {
      this.acceptedNames.set(merged.map((file) => file.name));
      this.rejectedNames.set(rejected);
      this.maxFilesModalVisible.set(true);
    }
  }

  manageFiles(): void {
    this.maxFilesModalVisible.set(false);
    const target = this.filesSection()?.nativeElement;
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
          this.resources.forEach((resource) => resource.reload());
          this.router.navigate(['/']);
        },
        error: (err) => {
          console.log(err)
          // Capturar el error del backend
          const httpError = err as HttpErrorResponse;
          const body = httpError.error as FileProcessingError | undefined;

          this.processError.set({
            exito: false,
            mensaje:
              body?.mensaje ??
              'Archivo no válido. Por favor, verifique el contenido de los datos y asegúrese de que cumpla con el formato esperado.',
            errores: body?.errores ?? [],
          });
          this.processing.set(false);
          this.processErrorModalVisible.set(true);
        },
        complete: () => {
          this.processing.set(false);
        },
      });
    } catch (err) {
      this.processing.set(false);
    }
  }

  closeProcessErrorModal(): void {
    this.processErrorModalVisible.set(false);
  }
}
