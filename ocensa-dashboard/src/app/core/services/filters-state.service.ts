// filters-state.service.ts
import { Injectable, signal } from '@angular/core';

export interface DashboardFilters {
  tanque: string | null;
  year: number | null;
  months: number[];
}

@Injectable({ providedIn: 'root' })
export class FiltersStateService {
  // estado reactivo de los filtros
  private readonly _filters = signal<DashboardFilters>({
    tanque: null,
    year: null,
    months: [],
  });

  // lectura pública (readonly) para que los hijos la consuman
  readonly filters = this._filters.asReadonly();

  // el topbar llama esto cuando cambian los filtros
  setFilters(filters: Partial<DashboardFilters>): void {
    this._filters.update(current => ({ ...current, ...filters }));
  }
}