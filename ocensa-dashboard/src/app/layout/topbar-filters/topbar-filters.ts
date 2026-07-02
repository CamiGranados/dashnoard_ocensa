import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Select } from 'primeng/select';
import { Checkbox } from 'primeng/checkbox';

interface FilterOption {
  label: string;
  value: string;
}

@Component({
  selector: 'app-topbar-filters',
  imports: [FormsModule, Select, Checkbox],
  templateUrl: './topbar-filters.html',
  styleUrl: './topbar-filters.css',
})
export class TopbarFilters {
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

  Resumen = 'Resumen';
  variable = 'bsr_bpa';
  escala = 'log';
  period = '24h';
  mostrarAlertas = true;
}
