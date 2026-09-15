// filters-state.service.ts
import { Injectable, computed, signal } from '@angular/core';

export interface DashboardFilters {
  tank: string | null;
  years: number[] | null;
  months: number[];
  company: string | null;
}

const arrayEqual = {
  equal: (a: readonly number[], b: readonly number[]) =>
    a.length === b.length && a.every((v, i) => v === b[i]),
};

@Injectable({ providedIn: 'root' })
export class FiltersStateService {
  private readonly _tank = signal<string | null>(null);
  private readonly _years = signal<number[]>([], arrayEqual);
  private readonly _months = signal<number[]>([], arrayEqual);
  private readonly _company = signal<string | null>(null);

  readonly tanque = this._tank.asReadonly();
  readonly years = this._years.asReadonly();
  readonly months = this._months.asReadonly();
  readonly company = this._company.asReadonly();


  readonly filters = computed<DashboardFilters>(() => ({
    tank: this._tank(),
    years: this._years(),
    months: this._months(),
    company: this._company(),
  }));

  // el topbar llama esto cuando cambian los filtros
  setFilters(filters: Partial<DashboardFilters>): void {
    if ('tank' in filters) this._tank.set(filters.tank ?? null);
    if ('years'  in filters) this._years.set(filters.years ?? []);
    if ('months' in filters) this._months.set(filters.months ?? []);
    if ('company' in filters) this._company.set(filters.company ?? null);
  }
}