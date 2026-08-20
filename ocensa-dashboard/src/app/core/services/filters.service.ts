import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Tank {
  id: string;
  name: string;
}

export interface AnalysisFilterOptions {
  datasetReleaseId: string;
  tanks: Tank[];
  years: number[];
}

export interface AnalysisFilterOptionsIssue {
  code: string;
  message: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function compareOrdinal(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

/** Rejects filter catalogs that could make dashboard modules query different populations. */
export function validateAnalysisFilterOptions(
  value: unknown,
  expectedDatasetReleaseId: string,
): AnalysisFilterOptionsIssue[] {
  const issues: AnalysisFilterOptionsIssue[] = [];
  if (!isRecord(value)) {
    return [
      {
        code: 'FILTER_OPTIONS_SHAPE_INVALID',
        message: 'Las opciones de filtro deben ser un objeto versionado.',
      },
    ];
  }

  if (value['datasetReleaseId'] !== expectedDatasetReleaseId) {
    issues.push({
      code: 'FILTER_OPTIONS_RELEASE_MISMATCH',
      message: 'Las opciones de filtro no corresponden al release solicitado.',
    });
  }

  const tanks = value['tanks'];
  const years = value['years'];
  if (!Array.isArray(tanks) || !Array.isArray(years)) {
    issues.push({
      code: 'FILTER_OPTIONS_SHAPE_INVALID',
      message: 'tanks y years deben ser arreglos explícitos.',
    });
    return issues;
  }

  const exactTankIds = new Set<string>();
  const foldedTankIds = new Set<string>();
  let previousTankId: string | null = null;
  for (const tank of tanks) {
    if (!isRecord(tank)) {
      issues.push({
        code: 'FILTER_OPTION_TANK_INVALID',
        message: 'Cada tanque requiere id y name canónicos.',
      });
      continue;
    }
    const id = tank['id'];
    const name = tank['name'];
    if (
      typeof id !== 'string' ||
      typeof name !== 'string' ||
      !id.trim() ||
      !name.trim() ||
      id !== id.trim() ||
      name !== name.trim() ||
      id !== name
    ) {
      issues.push({
        code: 'FILTER_OPTION_TANK_INVALID',
        message: 'Cada tanque requiere id y name canónicos, idénticos y sin espacios periféricos.',
      });
      continue;
    }

    const foldedId = id.toUpperCase();
    if (exactTankIds.has(id)) {
      issues.push({
        code: 'FILTER_OPTION_TANK_DUPLICATE',
        message: `El tanque ${id} aparece más de una vez.`,
      });
    } else if (foldedTankIds.has(foldedId)) {
      issues.push({
        code: 'FILTER_OPTION_TANK_AMBIGUOUS',
        message: `El tanque ${id} es ambiguo por mayúsculas/minúsculas.`,
      });
    }
    if (previousTankId !== null && compareOrdinal(previousTankId, id) >= 0) {
      issues.push({
        code: 'FILTER_OPTION_TANK_ORDER_INVALID',
        message: 'Los tanques deben venir ordenados de forma ordinal ascendente por id.',
      });
    }
    exactTankIds.add(id);
    foldedTankIds.add(foldedId);
    previousTankId = id;
  }

  let previousYear: number | null = null;
  const uniqueYears = new Set<number>();
  for (const year of years) {
    if (typeof year !== 'number' || !Number.isInteger(year) || year < 1900 || year > 9999) {
      issues.push({
        code: 'FILTER_OPTION_YEAR_INVALID',
        message: 'Cada año debe ser un entero entre 1900 y 9999.',
      });
      continue;
    }
    if (uniqueYears.has(year)) {
      issues.push({
        code: 'FILTER_OPTION_YEAR_DUPLICATE',
        message: `El año ${year} aparece más de una vez.`,
      });
    }
    if (previousYear !== null && year <= previousYear) {
      issues.push({
        code: 'FILTER_OPTION_YEAR_ORDER_INVALID',
        message: 'Los años deben venir en orden ascendente estricto.',
      });
    }
    uniqueYears.add(year);
    previousYear = year;
  }

  return issues;
}

@Injectable({ providedIn: 'root' })
export class FiltersService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getAnalysisFilterOptions(datasetReleaseId: string): Observable<AnalysisFilterOptions> {
    return this.http.get<AnalysisFilterOptions>(
      `${this.apiUrl}/v1/dataset-releases/${encodeURIComponent(datasetReleaseId)}/filter-options`,
    );
  }
}
