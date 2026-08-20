import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, computed, input, signal } from '@angular/core';
import { ChartModule } from 'primeng/chart';
import { Subject } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { analyticalTraceFixture } from '../../../../testing/analytical-trace-fixture';
import {
  COVERAGE_DENOMINATOR_DEFINITION_V1,
  COVERAGE_DIMENSION_LABEL_V1,
  COVERAGE_NUMERATOR_DEFINITION_V1,
  COVERAGE_RAW_STATE_SPECS_V1,
  COVERAGE_STATE_DIMENSION_LABEL_V1,
  COVERAGE_VALUE_AXIS_V1,
  COVERAGE_VALUE_TICKS_V1,
  CoverageMetricResponse,
} from '../../../core/models/coverage.model';
import { CoverageService } from '../../../core/services/coverage.service';
import { DatasetReleaseStore } from '../../../core/services/dataset-release-store.service';
import { FiltersStateService } from '../../../core/services/filters-state.service';
import {
  Coverage,
  classifyCoverageFailure,
  shouldInvalidateReleaseForCoverageFailure,
} from './coverage';

@Component({
  selector: 'p-chart',
  template: '',
})
class ChartStub {
  readonly type = input<string>();
  readonly data = input<unknown>();
  readonly options = input<unknown>();
}

function coverageTrace(pointId: string, traceToken: string): string {
  return analyticalTraceFixture({
    metricId: 'THPS.DATA.COVERAGE.V1',
    chartId: 'H11',
    chartVersion: 'V1',
    resultSetId: 'result-1',
    pointId,
    traceToken,
    filters: { tank: 'TK1', year: '2026' },
  });
}

function response(): CoverageMetricResponse {
  return {
    metricId: 'THPS.DATA.COVERAGE.V1',
    metricVersion: 'V1',
    datasetReleaseId: 'release-1',
    importBatchId: 'batch-1',
    calculationRunId: 'run-1',
    resultSetId: 'result-1',
    generatedAt: '2026-08-20T12:00:00Z',
    cutoffDate: '2026-05-23',
    periodStart: '2026-01-01',
    periodEnd: '2026-05-23',
    partialPeriod: false,
    approvalStatus: 'approved_current',
    approvalLabel: 'Aprobado vigente',
    unit: '%',
    chemicalBasis: null,
    n: 149,
    eligibleN: 400,
    numerator: 149,
    numeratorDefinition: COVERAGE_NUMERATOR_DEFINITION_V1,
    denominator: 400,
    denominatorDefinition: COVERAGE_DENOMINATOR_DEFINITION_V1,
    coverage: 0.3725,
    coverageDisplay: '37.25 %',
    warnings: [],
    filtersApplied: { tank: 'TK1', year: '2026' },
    exportPopulationToken: 'population-1',
    dimensionLabel: COVERAGE_DIMENSION_LABEL_V1,
    stateDimensionLabel: COVERAGE_STATE_DIMENSION_LABEL_V1,
    valueAxis: { ...COVERAGE_VALUE_AXIS_V1 },
    valueTicks: COVERAGE_VALUE_TICKS_V1.map((tick) => ({ ...tick })),
    states: COVERAGE_RAW_STATE_SPECS_V1.map((state) => ({ ...state })),
    rows: (['BSR', 'BPA', 'BHT', 'BAnT'] as const).map((group) => {
      const rowId = `tank-1-${group.toLowerCase()}`;
      return {
        rowId,
        tank: 'TK1',
        group,
        label: `TK1 · ${group}`,
        cells: COVERAGE_RAW_STATE_SPECS_V1.map((state, stateIndex) => {
          const count = state.id === 'reported_zero' ? 149 : state.id === 'invalid' ? 251 : 0;
          const pointId = `${rowId}-${state.id}`;
          const traceToken = `trace-${pointId}`;
          const percentage = count === 149 ? '37.25' : count === 251 ? '62.75' : '0';
          return {
            pointId,
            rowId,
            stateId: state.id,
            count,
            denominator: 400,
            proportion: count / 400,
            displayValue: `${percentage} % (${count}/400)`,
            traceToken,
            traceEndpoint: coverageTrace(pointId, traceToken),
            traceResultSetId: 'result-1',
            tracePointId: pointId,
            sourceCellCount: count,
            lineagePreview: count > 0 ? [`Sheet1!Q${stateIndex + 1}`] : [],
            warnings: [],
          };
        }),
      };
    }),
  };
}

describe('Coverage', () => {
  let fixture: ComponentFixture<Coverage>;
  let responses: Subject<CoverageMetricResponse>;
  let releaseId: ReturnType<typeof signal<string | null>>;
  let invalidateForQueryFailure: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    responses = new Subject<CoverageMetricResponse>();
    releaseId = signal<string | null>('release-1');
    invalidateForQueryFailure = vi.fn(() => releaseId.set(null));

    const releaseStore = {
      analysisReleaseId: computed(() => releaseId()),
      hasQueryableRelease: computed(() => releaseId() !== null),
      invalidateForQueryFailure,
      gateMessage: computed(() => 'Resultados bloqueados.'),
    };
    const coverageService = {
      getCoverage: vi.fn(() => responses.asObservable()),
    };
    const filtersState = {
      filters: signal({ tank: 'TK1', years: [2026], months: [] }),
    };

    TestBed.overrideComponent(Coverage, {
      remove: { imports: [ChartModule] },
      add: { imports: [ChartStub] },
    });

    await TestBed.configureTestingModule({
      imports: [Coverage],
      providers: [
        provideHttpClient(),
        { provide: DatasetReleaseStore, useValue: releaseStore },
        { provide: CoverageService, useValue: coverageService },
        { provide: FiltersStateService, useValue: filtersState },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Coverage);
    fixture.detectChanges();
  });

  it('renders API proportions and an equivalent table only for an approved contract', async () => {
    responses.next(response());
    fixture.detectChanges();
    await fixture.whenStable();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Aprobado vigente');
    expect(text).toContain(COVERAGE_NUMERATOR_DEFINITION_V1);
    expect(text).toContain(COVERAGE_DENOMINATOR_DEFINITION_V1);
    expect(text).toContain('37.25 % (149/400)');
    expect(text).toContain('ResultSet result-1');
    expect(fixture.nativeElement.querySelector('p-chart')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('table')).not.toBeNull();
    const firstDetails = fixture.nativeElement.querySelector('details') as HTMLDetailsElement;
    firstDetails.open = true;
    fixture.detectChanges();
    const traceLink = firstDetails.querySelector(
      'button.analytical-trace-link',
    ) as HTMLButtonElement;
    expect(traceLink.getAttribute('aria-label')).toContain('abre el visor');
  });

  it('clears output and invalidates the release when the wire release does not match', () => {
    const mismatched = response();
    mismatched.datasetReleaseId = 'another-release';
    responses.next(mismatched);
    fixture.detectChanges();

    expect(invalidateForQueryFailure).toHaveBeenCalledOnce();
    expect(fixture.nativeElement.textContent).toContain('Cobertura no publicable');
    expect(fixture.nativeElement.querySelector('p-chart')).toBeNull();
    expect(fixture.nativeElement.querySelector('table')).toBeNull();
  });

  it('fails closed and invalidates shared context when applied filters differ', () => {
    const mismatched = response();
    mismatched.filtersApplied = { tank: 'TK1', year: '2025' };
    responses.next(mismatched);
    fixture.detectChanges();

    expect(invalidateForQueryFailure).toHaveBeenCalledOnce();
    expect(fixture.nativeElement.textContent).toContain('DASHBOARD_FILTER_YEAR_MISMATCH');
    expect(fixture.nativeElement.querySelector('p-chart')).toBeNull();
  });

  it('renders only the explicitly authorized provisional descriptive profile', () => {
    const provisional = response();
    provisional.approvalStatus = 'provisional_descriptive';
    provisional.approvalLabel = 'Perfil descriptivo provisional';
    responses.next(provisional);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Perfil descriptivo provisional');
    expect(fixture.nativeElement.textContent).toContain('NO OPERACIONAL');
    expect(fixture.nativeElement.textContent).not.toContain('Aprobado');
    expect(fixture.nativeElement.querySelector('p-chart')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('table')).not.toBeNull();
  });

  it('keeps a generic provisional metric blocked', () => {
    const provisional = response();
    provisional.approvalStatus = 'provisional';
    provisional.approvalLabel = 'Provisional sin autorización descriptiva';
    responses.next(provisional);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Métrica de cobertura bloqueada');
    expect(fixture.nativeElement.querySelector('p-chart')).toBeNull();
  });

  it('maps service unavailability to a fail-closed calculation state', () => {
    responses.error(
      new HttpErrorResponse({
        status: 503,
        error: { detail: 'Motor de métricas no disponible.' },
      }),
    );
    fixture.detectChanges();

    expect(invalidateForQueryFailure).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Motor de métricas no disponible.');
    expect(fixture.nativeElement.querySelector('p-chart')).toBeNull();
  });

  it('does not discard the release identity for a scientifically blocked metric', () => {
    responses.error(
      new HttpErrorResponse({
        status: 422,
        error: { detail: 'Contrato métrico pendiente.' },
      }),
    );
    fixture.detectChanges();

    expect(invalidateForQueryFailure).not.toHaveBeenCalled();
    expect(releaseId()).toBe('release-1');
    expect(fixture.nativeElement.textContent).toContain('Contrato métrico pendiente.');
  });
});

describe('classifyCoverageFailure', () => {
  it('uses typed fail-closed states for HTTP contract errors', () => {
    expect(classifyCoverageFailure(new HttpErrorResponse({ status: 409 })).status).toBe(
      'blocked_join',
    );
    expect(classifyCoverageFailure(new HttpErrorResponse({ status: 422 })).status).toBe(
      'pending_validation',
    );
    expect(classifyCoverageFailure(new HttpErrorResponse({ status: 503 })).status).toBe(
      'calculation_error',
    );
  });

  it('surfaces the exact warnings from the backend unavailable contract', () => {
    const failure = classifyCoverageFailure(
      new HttpErrorResponse({
        status: 503,
        error: {
          approvalStatus: 'blocked',
          code: 'ANALYTICS_STORAGE_UNAVAILABLE',
          message: 'El proveedor no pudo consultar el almacenamiento analítico.',
          warnings: ['no_cached_or_legacy_result_returned'],
        },
      }),
    );

    expect(failure.status).toBe('calculation_error');
    expect(failure.message).toContain('almacenamiento analítico');
    expect(failure.reasons).toEqual(['no_cached_or_legacy_result_returned']);
  });

  it('invalidates the release only when the error proves stale identity', () => {
    expect(shouldInvalidateReleaseForCoverageFailure(new HttpErrorResponse({ status: 404 }))).toBe(
      true,
    );
    expect(shouldInvalidateReleaseForCoverageFailure(new HttpErrorResponse({ status: 422 }))).toBe(
      false,
    );
    expect(shouldInvalidateReleaseForCoverageFailure(new HttpErrorResponse({ status: 503 }))).toBe(
      false,
    );
    expect(
      shouldInvalidateReleaseForCoverageFailure(
        new HttpErrorResponse({
          status: 503,
          error: { code: 'ANALYTICAL_RESULT_IDENTITY_MISMATCH' },
        }),
      ),
    ).toBe(true);
  });
});
