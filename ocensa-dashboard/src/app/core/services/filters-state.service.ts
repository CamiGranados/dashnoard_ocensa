// filters-state.service.ts
import { Injectable, computed, signal } from '@angular/core';

export interface DashboardFilters {
  tank: string | null;
  years: number[] | null;
  months: number[];
}

export type AppliedDashboardFilterValue = string | number | boolean | Array<string | number> | null;

export interface DashboardFilterContractIssue {
  code: string;
  message: string;
}

type FilterDimension = 'tank' | 'year' | 'month';

function hasOwn(record: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}

function normalizeAppliedValues(
  value: AppliedDashboardFilterValue | undefined,
  dimension: FilterDimension,
): string[] | null {
  if (value === null || value === undefined) return [];
  const values = Array.isArray(value) ? value : [value];
  if (values.length === 0) return [];

  const normalized: string[] = [];
  for (const item of values) {
    if (dimension === 'tank') {
      if (typeof item !== 'string' || !item.trim()) return null;
      normalized.push(item.trim());
      continue;
    }

    const numeric = typeof item === 'number' ? item : Number(item);
    if (
      typeof item === 'boolean' ||
      !Number.isInteger(numeric) ||
      (dimension === 'year' && (numeric < 1900 || numeric > 9999)) ||
      (dimension === 'month' && (numeric < 1 || numeric > 12))
    ) {
      return null;
    }
    normalized.push(String(numeric));
  }

  if (new Set(normalized).size !== normalized.length) return null;
  return normalized.sort((left, right) => left.localeCompare(right, 'en', { numeric: true }));
}

/**
 * Reconciles only the shared dashboard dimensions. It does not inspect rows or
 * calculate scientific values; it rejects a response produced for another
 * tank or calendar selection.
 */
export function validateAppliedDashboardFilters(
  applied: Record<string, AppliedDashboardFilterValue> | null | undefined,
  requested: DashboardFilters,
  expectedAdditional: Readonly<Record<string, string | number | boolean>> = {},
): DashboardFilterContractIssue[] {
  if (!applied || typeof applied !== 'object' || Array.isArray(applied)) {
    return [
      {
        code: 'DASHBOARD_FILTERS_INVALID',
        message: 'filtersApplied debe declarar un objeto canónico.',
      },
    ];
  }

  const issues: DashboardFilterContractIssue[] = [];
  const expected: Record<FilterDimension, string[]> = {
    tank: requested.tank?.trim() ? [requested.tank.trim()] : [],
    year: [...new Set(requested.years ?? [])].sort((left, right) => left - right).map(String),
    month: [...new Set(requested.months)].sort((left, right) => left - right).map(String),
  };

  for (const dimension of ['tank', 'year', 'month'] as const) {
    const actual = normalizeAppliedValues(applied[dimension], dimension);
    if (
      actual === null ||
      actual.length !== expected[dimension].length ||
      actual.some((value, index) => value !== expected[dimension][index])
    ) {
      issues.push({
        code: `DASHBOARD_FILTER_${dimension.toUpperCase()}_MISMATCH`,
        message: `El filtro aplicado ${dimension} no coincide con la selección solicitada.`,
      });
    }
  }

  for (const alias of ['tankId', 'years', 'months']) {
    if (hasOwn(applied, alias)) {
      issues.push({
        code: 'DASHBOARD_FILTER_ALIAS_INVALID',
        message: `filtersApplied no puede usar el alias no canónico ${alias}.`,
      });
    }
  }

  for (const [dimension, expectedValue] of Object.entries(expectedAdditional)) {
    if (!hasOwn(applied, dimension) || applied[dimension] !== expectedValue) {
      issues.push({
        code: 'DASHBOARD_FILTER_ADDITIONAL_MISMATCH',
        message: `El filtro aplicado ${dimension} no coincide con el valor fijo autorizado.`,
      });
    }
  }

  const canonicalDimensions = new Set([
    'tank',
    'year',
    'month',
    ...Object.keys(expectedAdditional),
  ]);
  const unexpectedDimensions = Object.keys(applied).filter(
    (dimension) => !canonicalDimensions.has(dimension),
  );
  if (unexpectedDimensions.length) {
    issues.push({
      code: 'DASHBOARD_FILTER_UNREQUESTED_DIMENSION',
      message: `filtersApplied contiene dimensiones no solicitadas: ${unexpectedDimensions.sort().join(', ')}.`,
    });
  }

  return issues;
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

  readonly tanque = this._tank.asReadonly();
  readonly years = this._years.asReadonly();
  readonly months = this._months.asReadonly();

  readonly filters = computed<DashboardFilters>(() => ({
    tank: this._tank(),
    years: this._years(),
    months: this._months(),
  }));

  // el topbar llama esto cuando cambian los filtros
  setFilters(filters: Partial<DashboardFilters>): void {
    if ('tank' in filters) this._tank.set(filters.tank ?? null);
    if ('years' in filters) this._years.set(filters.years ?? []);
    if ('months' in filters) this._months.set(filters.months ?? []);
  }
}
