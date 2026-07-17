import { Component, signal, viewChild} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Select } from 'primeng/select';
import { Button } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { FileRemoveEvent, FileSelectEvent, FileUpload, FileUploadModule } from 'primeng/fileupload';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { Spinner } from '../../core/shared/components/spinner/spinner';
import { FilesStore } from '../../core/services/file-store.service';
import { Router } from '@angular/router';

interface FilterOption {
  label: string;
  value: string;
}

export interface fileError {
  file: string;
  error: string;
}

@Component({
  selector: 'app-topbar-filters',
  imports: [CommonModule, FormsModule, Select, Button, FileUploadModule, DialogModule, ToastModule, Spinner],
  templateUrl: './topbar-filters.html',
  styleUrl: './topbar-filters.css',
  providers: [MessageService],
})

export class TopbarFilters {
  excelUpload = viewChild.required<FileUpload>('excelUpload');

  readonly max_files = 5; // Maximum number of files allowed
  displayModalFiles: boolean = false;
  selectedFiles: File[] = [];
  firstFilterErrors = signal<fileError[]>([]);
  validating = signal(false);

  constructor(private messageService: MessageService, private filesStore: FilesStore, private router: Router) {}

  // -------------------------------------------------- Sets the file limit
  onFilesSelected(event: FileSelectEvent): void {
    const upload = this.excelUpload();
    const files = upload.files;

    if(files.length > this.max_files){
      upload.files = files.slice(0, this.max_files)
      this.messageService.add({
        severity: 'warn',
        summary: 'Límite de archivos',
        detail: `Solo se permiten ${this.max_files} archivos. Los archivos adicionales fueron descartados.`
      });
    }
  }

  // -------------------------------- Review of the files selected  -------------------------------
  private async readFirstBytes(file: File, numBytes:8): Promise<Uint8Array> {
    const blob = file.slice(0, numBytes);
    const arrayBuffer = await blob.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  }

  private IdentifySecurityFile(bytes: Uint8Array): 'xlsx' | 'ole' | 'unknown' {
    if (bytes[0] === 0x50 && bytes[1] === 0x4B && bytes[2] === 0x03 && bytes[3] === 0x04) {
      return 'xlsx';
    }else if (bytes[0] === 0xD0 && bytes[1] === 0xCF && bytes[2] === 0x11 && bytes[3] === 0xE0) {
      return 'ole';
    }
    return 'unknown';
  }

  private async validateFile(file: File): Promise<string | null> {
    if (!file.name.toLocaleLowerCase().endsWith('.xlsx')) {
      return 'El archivo no tiene la extensión .xlsx';
    }
    if(file.size === 0){
      return 'El archivo está vacío';
    }
    if (file.size < 1024){
      return 'El archivo es demasiado pequeño para ser un archivo Excel válido';
    }
    const firstBytes = await this.readFirstBytes(file, 8);
    const fileType = this.IdentifySecurityFile(firstBytes);
    if (fileType === 'ole') {
      return 'El archivo está protegido con contraseña o no es compatible. Guárdalo como .xlsx sin contraseña';
    } else if (fileType === 'unknown') {
      return 'El archivo no es un archivo Excel válido';
    }
    return null;
  }

  private validateDuplicates(files: File[]): fileError[] {
    const errors: fileError[] = [];
    const fileNames = new Map<string, string>();

    for (const file of files){
      const code = `${file.name.trim().toLowerCase()}|${file.size}`;

      if(fileNames.has(code)){
        errors.push({
          file: file.name,
          error: `Archivo duplicado (ya seleccionaste "${fileNames.get(code)}")`
        });
      } else{
        fileNames.set(code, file.name);
      }
    }
    return errors;
  }

  async loadFiles(): Promise<void>{
    const files = this.excelUpload().files;

    if (!files?.length){
      this.messageService.add({
        severity: 'warn',
        summary: 'Sin archivos',
        detail: 'Selecciona al menos un archivo antes de cargar'
      });
      return;
    }

    this.validating.set(true);
    this.firstFilterErrors.set([]);
    try{
      const errors: fileError[] = [];
      errors.push(...this.validateDuplicates(files));

      const results = await Promise.all(
        files.map(async (file) => ({
          file: file.name,
          error: await this.validateFile(file)
        }))
      );

      errors.push(
      ...results
        .filter((r): r is { file: string; error: string } => r.error !== null));

      if(errors.length > 0){
        this.firstFilterErrors.set(errors);
        this.messageService.add({
          severity: 'error',
          summary: 'Errores de validación',
          detail: `${errors.length} problema(s) encontrado(s). Revisa el detalle.`
        });
        return;
      }

      this.filesStore.setFiles([...files]);
      this.displayModalFiles = false;
      this.excelUpload().clear();
      this.router.navigate(['/carga-datos'])

    } finally{
      this.validating.set(false);
    }
  }


  onFileRemoved(event: FileRemoveEvent): void {
    this.selectedFiles = this.selectedFiles.filter((file) => file !== event.file);
  }

  showAlertLoadedFiles(): void {
    this.displayModalFiles = true;
  }


  // --------------------------------------------------    EJEMPLO DE OPCIONES DE FILTRO
  readonly reviewOptions: FilterOption[] = [
    { label: 'Resumen', value: 'resumen' },
    { label: 'Detalle', value: 'detalle' },
  ];

  readonly variableOptions: FilterOption[] = [
    { label: 'BSR + BPA', value: 'bsr_bpa' },
    { label: 'BSR', value: 'bsr' },
    { label: 'BPA', value: 'bpa' },
  ];

  readonly escalaOptions: FilterOption[] = [
    { label: 'Logarítmica', value: 'log' },
    { label: 'Lineal', value: 'linear' },
  ];

  readonly periodOptions: FilterOption[] = [
    { label: 'Últimas 24 horas', value: '24h' },
    { label: 'Últimos 7 días', value: '7d' },
    { label: 'Últimos 30 días', value: '30d' },
  ];

  readonly tankOptions: FilterOption[] = [
    { label: 'TK-001', value: 'tk1' },
    { label: 'TK-002', value: 'tk2' },
    { label: 'TK-003', value: 'tk3' },
  ];

  tanque = 'tk1';
  resumen = 'resumen';
  variable = 'bsr_bpa';
  escala = 'log';
  period = '24h';
  mostrarAlertas = true;
}
