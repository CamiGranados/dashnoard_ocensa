import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Select } from 'primeng/select';
import { Checkbox } from 'primeng/checkbox';
import { Button } from 'primeng/button';
import { FileUploadEvent, FileUploadModule } from 'primeng/fileupload';

interface FilterOption {
  label: string;
  value: string;
}

@Component({
  selector: 'app-topbar-filters',
  imports: [FormsModule, Select, Checkbox, Button, FileUploadModule],
  templateUrl: './topbar-filters.html',
  styleUrl: './topbar-filters.css',
})

export class TopbarFilters {

  selectedFiles: File[] = [];

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    console.log(input)
  }

  loadFiles(event: FileUploadEvent): void{
    console.log('Files loaded:', event.files);

  }

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
