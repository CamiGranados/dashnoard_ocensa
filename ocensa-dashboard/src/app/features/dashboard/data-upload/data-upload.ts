import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Button } from 'primeng/button';
import { Tag } from 'primeng/tag';
import { Select } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { Message } from 'primeng/message';
import { Breadcrumb } from 'primeng/breadcrumb';
import { MenuItem } from 'primeng/api';

interface SelectedFile {
  id: string;
  fileName: string;
  category: string;
  sizeKb: number;
  status: 'ok' | 'error';
}

interface PreviewColumn {
  field: string;
  header: string;
}

interface PreviewDataset {
  id: string;
  fileName: string;
  sheetName: string;
  columns: PreviewColumn[];
  rows: Record<string, string>[];
  totalRows: number;
}

interface RowsOption {
  label: string;
  value: number;
}

@Component({
  selector: 'app-data-upload',
  imports: [FormsModule, Button, Tag, Select, TableModule, Message, Breadcrumb],
  templateUrl: './data-upload.html',
  styleUrl: './data-upload.css',
})
export class DataUpload {
  private readonly router = inject(Router);

  readonly breadcrumbItems: MenuItem[] = [
    { label: 'CIC' },
    { label: 'OCENSA' },
    { label: 'Dashboard Técnico' },
    { label: 'Vista Ejecutiva' },
    { label: 'Carga de datos' },
  ];

  readonly activeTank = 'TK-001';
  readonly lastUpdate = '10 Jul 2026 · 09:35 AM';
  readonly overallStatus = 'Normal';

  readonly rowsOptions: RowsOption[] = [
    { label: '10', value: 10 },
    { label: '20', value: 20 },
    { label: '50', value: 50 },
  ];
  rowsToShow = 10;

  selectedFiles: SelectedFile[] = [
    { id: 'microbiology', fileName: 'Microbiologia_TK001_20250710.xlsx', category: 'Microbiologia', sizeKb: 78, status: 'ok' },
    { id: 'physicochemistry', fileName: 'Fisicoquimica_TK001_20250710.xlsx', category: 'Fisicoquimica', sizeKb: 124, status: 'ok' },
    { id: 'corrosion', fileName: 'Corrosion_TK001_20250710.xlsx', category: 'Corrosion', sizeKb: 96, status: 'ok' },
    { id: 'free-water', fileName: 'AguaLibre_TK001_20250710.xlsx', category: 'Agua Libre', sizeKb: 65, status: 'ok' },
  ];

  readonly previewDatasets: PreviewDataset[] = [
    {
      id: 'microbiology',
      fileName: 'Microbiologia_TK001_20250710.xlsx',
      sheetName: 'BSR',
      columns: [
        { field: 'fecha', header: 'Fecha / Hora' },
        { field: 'bsr', header: 'BSR (cel/mL)' },
        { field: 'observaciones', header: 'Observaciones' },
      ],
      rows: [
        { fecha: '10/07/2026 09:00', bsr: '2.4 × 10⁵', observaciones: '–' },
        { fecha: '10/07/2026 08:00', bsr: '1.8 × 10⁵', observaciones: '–' },
        { fecha: '10/07/2026 07:00', bsr: '1.6 × 10⁵', observaciones: '–' },
        { fecha: '10/07/2026 06:00', bsr: '1.2 × 10⁵', observaciones: '–' },
      ],
      totalRows: 24,
    },
    {
      id: 'physicochemistry',
      fileName: 'Fisicoquimica_TK001_20250710.xlsx',
      sheetName: 'Parametros',
      columns: [
        { field: 'fecha', header: 'Fecha / Hora' },
        { field: 'ph', header: 'pH' },
        { field: 'conductividad', header: 'Conductividad (uS/cm)' },
        { field: 'temp', header: 'Temp (°C)' },
      ],
      rows: [
        { fecha: '10/07/2026 09:00', ph: '7.25', conductividad: '1,250', temp: '32.1' },
        { fecha: '10/07/2026 08:00', ph: '7.18', conductividad: '1,240', temp: '31.8' },
        { fecha: '10/07/2026 07:00', ph: '7.22', conductividad: '1,210', temp: '31.6' },
        { fecha: '10/07/2026 06:00', ph: '7.20', conductividad: '1,200', temp: '31.4' },
      ],
      totalRows: 24,
    },
    {
      id: 'corrosion',
      fileName: 'Corrosion_TK001_20250710.xlsx',
      sheetName: 'Corrosion',
      columns: [
        { field: 'fecha', header: 'Fecha / Hora' },
        { field: 'corrosion', header: 'Corrosión (mpy)' },
        { field: 'tasa', header: 'Tasa (mpy)' },
        { field: 'metodo', header: 'Método' },
      ],
      rows: [
        { fecha: '10/07/2026 09:00', corrosion: '1.32', tasa: '1.32', metodo: 'LPR' },
        { fecha: '10/07/2026 08:00', corrosion: '1.41', tasa: '1.41', metodo: 'LPR' },
        { fecha: '10/07/2026 07:00', corrosion: '1.38', tasa: '1.38', metodo: 'LPR' },
        { fecha: '10/07/2026 06:00', corrosion: '1.35', tasa: '1.35', metodo: 'LPR' },
      ],
      totalRows: 24,
    },
    {
      id: 'free-water',
      fileName: 'AguaLibre_TK001_20250710.xlsx',
      sheetName: 'Agua Libre',
      columns: [
        { field: 'fecha', header: 'Fecha / Hora' },
        { field: 'aguaLibre', header: 'Agua libre (%)' },
        { field: 'metodo', header: 'Método' },
      ],
      rows: [
        { fecha: '10/07/2026 09:00', aguaLibre: '18', metodo: 'ASTM D4377' },
        { fecha: '10/07/2026 08:00', aguaLibre: '16', metodo: 'ASTM D4377' },
        { fecha: '10/07/2026 07:00', aguaLibre: '15', metodo: 'ASTM D4377' },
        { fecha: '10/07/2026 06:00', aguaLibre: '14', metodo: 'ASTM D4377' },
      ],
      totalRows: 24,
    },
  ];

  get okFilesCount(): number {
    return this.selectedFiles.filter((file) => file.status === 'ok').length;
  }

  addFiles(input: HTMLInputElement): void {
    input.value = '';
    input.click();
  }

  onFilesPicked(event: Event): void {
    const files = (event.target as HTMLInputElement).files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      this.selectedFiles.push({
        id: `${file.name}-${Date.now()}`,
        fileName: file.name,
        category: 'Nuevo archivo',
        sizeKb: Math.round(file.size / 1024),
        status: 'ok',
      });
    });
  }

  removeFile(id: string): void {
    this.selectedFiles = this.selectedFiles.filter((file) => file.id !== id);
  }

  clearFiles(): void {
    this.selectedFiles = [];
  }

  cancel(): void {
    this.router.navigate(['/']);
  }

  proceed(): void {
    // Punto de integración con el servicio de ensamble y validación de datos.
    this.router.navigate(['/']);
  }
}
