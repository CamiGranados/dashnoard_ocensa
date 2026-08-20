import { CommonModule } from '@angular/common';
import { Component, effect, inject, OnDestroy, OnInit, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { FileRemoveEvent, FileSelectEvent, FileUpload, FileUploadModule } from 'primeng/fileupload';
import { MultiSelect } from 'primeng/multiselect';
import { Select } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { forkJoin, Subject, takeUntil } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import {
  MAX_IMPORT_FILES,
  validateImportSelection,
} from '../../core/models/dataset-release.model';
import { DatasetReleaseStore } from '../../core/services/dataset-release-store.service';
import { FilesStore } from '../../core/services/file-store.service';
import { FiltersService } from '../../core/services/filters.service';
import { FiltersStateService } from '../../core/services/filters-state.service';
import { Spinner } from '../../core/shared/components/spinner/spinner';

export interface FileSelectionError {
  file: string;
  error: string;
}

@Component({
  selector: 'app-topbar-filters',
  imports: [
    CommonModule,
    FormsModule,
    Select,
    Button,
    FileUploadModule,
    DialogModule,
    ToastModule,
    Spinner,
    MultiSelect,
  ],
  templateUrl: './topbar-filters.html',
  styleUrl: './topbar-filters.css',
  providers: [MessageService],
})
export class TopbarFilters implements OnInit, OnDestroy {
  private readonly messageService = inject(MessageService);
  private readonly filesStore = inject(FilesStore);
  private readonly router = inject(Router);
  private readonly filtersService = inject(FiltersService);
  private readonly filtersState = inject(FiltersStateService);
  private readonly releaseStore = inject(DatasetReleaseStore);
  private readonly filtersChanged$ = new Subject<void>();
  private readonly destroy$ = new Subject<void>();

  readonly excelUpload = viewChild.required<FileUpload>('excelUpload');
  readonly maxFiles = MAX_IMPORT_FILES;
  readonly firstFilterErrors = signal<FileSelectionError[]>([]);
  readonly validating = signal(false);
  readonly filterLoadError = signal<string | null>(null);
  readonly hasPublishedRelease = this.releaseStore.hasPublishedRelease;

  displayModalFiles = false;
  tankOptions: { label: string; value: string }[] = [];
  tank: string | null = null;
  yearOptions: { label: string; value: number }[] = [];
  selectedYears: number[] = [];
  selectedMonth: number | null = null;

  readonly monthOptions = [
    { label: 'Todos', value: null },
    { label: 'Enero', value: 1 },
    { label: 'Febrero', value: 2 },
    { label: 'Marzo', value: 3 },
    { label: 'Abril', value: 4 },
    { label: 'Mayo', value: 5 },
    { label: 'Junio', value: 6 },
    { label: 'Julio', value: 7 },
    { label: 'Agosto', value: 8 },
    { label: 'Septiembre', value: 9 },
    { label: 'Octubre', value: 10 },
    { label: 'Noviembre', value: 11 },
    { label: 'Diciembre', value: 12 },
  ];

  private readonly loadReleaseFilters = effect((onCleanup) => {
    const releaseId = this.releaseStore.releaseId();
    this.resetFilterOptions();
    if (!releaseId) return;

    const subscription = forkJoin({
      years: this.filtersService.getYears(releaseId),
      tanks: this.filtersService.getTanks(releaseId),
    }).subscribe({
      next: ({ years, tanks }) => {
        this.filterLoadError.set(null);
        this.yearOptions = years.map((year) => ({ label: String(year), value: year }));
        this.tankOptions = tanks.map((tank) => ({ label: tank.name, value: tank.id }));
      },
      error: () => {
        this.resetFilterOptions();
        this.filterLoadError.set('No fue posible cargar filtros para el release publicado.');
        this.releaseStore.invalidateForQueryFailure();
      },
    });

    onCleanup(() => subscription.unsubscribe());
  });

  ngOnInit(): void {
    this.filtersChanged$
      .pipe(debounceTime(400), takeUntil(this.destroy$))
      .subscribe(() => {
        if (!this.hasPublishedRelease()) return;
        this.filtersState.setFilters({
          tank: this.tank,
          years: this.selectedYears,
          months: this.selectedMonth ? [this.selectedMonth] : [],
        });
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.filtersChanged$.complete();
  }

  onFiltersChange(): void {
    this.filtersChanged$.next();
  }

  onFilesSelected(_event: FileSelectEvent): void {
    const upload = this.excelUpload();
    if (upload.files.length > this.maxFiles) {
      upload.files = upload.files.slice(0, this.maxFiles);
    }

    this.releaseStore.selectionChanged(upload.files);
    const validation = validateImportSelection(upload.files);
    this.firstFilterErrors.set(
      validation.errors.map((error) => ({ file: 'Lote', error })),
    );

    if (!validation.valid) {
      this.messageService.add({
        severity: 'error',
        summary: 'Selección no válida',
        detail: `${validation.errors.length} problema(s) encontrado(s).`,
      });
    }
  }

  onFileRemoved(_event: FileRemoveEvent): void {
    queueMicrotask(() => {
      const files = this.excelUpload().files;
      this.releaseStore.selectionChanged(files);
      const validation = validateImportSelection(files);
      this.firstFilterErrors.set(
        validation.errors
          .filter((error) => files.length > 0 || !error.includes('Seleccione'))
          .map((error) => ({ file: 'Lote', error })),
      );
    });
  }

  loadFiles(): void {
    const files = [...this.excelUpload().files];
    const validation = validateImportSelection(files);
    if (!validation.valid) {
      this.firstFilterErrors.set(validation.errors.map((error) => ({ file: 'Lote', error })));
      return;
    }

    this.validating.set(true);
    try {
      this.filesStore.setFiles(files);
      this.displayModalFiles = false;
      this.excelUpload().clear();
      void this.router.navigate(['/carga-datos']);
    } finally {
      this.validating.set(false);
    }
  }

  cancelFileSelection(): void {
    this.displayModalFiles = false;
    this.excelUpload().clear();
    this.firstFilterErrors.set([]);
  }

  showAlertLoadedFiles(): void {
    this.displayModalFiles = true;
  }

  private resetFilterOptions(): void {
    this.tankOptions = [];
    this.yearOptions = [];
    this.tank = null;
    this.selectedYears = [];
    this.selectedMonth = null;
    this.filtersState.setFilters({ tank: null, years: [], months: [] });
  }
}
