import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { Component, computed, input, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChartModule } from 'primeng/chart';
import { Subject } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { analyticalTraceFixture } from '../../../../testing/analytical-trace-fixture';
import {
  CorrosionCouponFacet,
  CorrosionCouponPoint,
  CorrosionCouponResponse,
} from '../../../core/models/corrosion-coupon.model';
import { CorrosionCouponService } from '../../../core/services/corrosion-coupon.service';
import { DatasetReleaseStore } from '../../../core/services/dataset-release-store.service';
import { FiltersStateService } from '../../../core/services/filters-state.service';
import {
  CorrosionCoupon,
  classifyCorrosionCouponFailure,
  shouldInvalidateReleaseForCorrosionCouponFailure,
} from './corrosion-coupon';

function dayNumber(value: string): number {
  return Math.floor(Date.parse(`${value}T00:00:00Z`) / 86_400_000) + 719_162;
}

@Component({ selector: 'p-chart', template: '' })
class ChartStub {
  readonly type = input<string>();
  readonly data = input<unknown>();
  readonly options = input<unknown>();
}

function couponTrace(pointId: string, traceToken: string): string {
  return analyticalTraceFixture({
    metricId: 'THPS.CORROSION.COUPON.MPY.V1',
    chartId: 'H10-COR-COUPON.V1',
    chartVersion: 'V1',
    resultSetId: 'result-corrosion',
    pointId,
    traceToken,
    filters: { year: '2026', method: 'coupon' },
  });
}

function validPoint(): CorrosionCouponPoint {
  const observationId = 'Sheet1-AD2';
  const traceToken = 'trace-ad2';
  return {
    observationId,
    resultSetId: 'result-corrosion',
    facetId: 'facet-tq55000',
    seriesId: 'series-tq55000',
    plotX: dayNumber('2026-05-19'),
    date: '2026-05-19',
    partialPeriod: true,
    tank: 'TQ55000',
    campaignRaw: 'II-2026 AQ',
    method: 'coupon',
    value: 2.37,
    plotValue: 2.37,
    valueDisplay: '2.37 mpy',
    rawValue: '2.37',
    valueStatus: 'valid',
    plotKind: 'exact',
    categoryId: 'moderada',
    reportedCategory: 'MODERADA',
    categoryStandardVersion: 'NACE SP0775-23',
    exposureStatus: 'missing',
    exposureStart: null,
    exposureEnd: null,
    unit: 'mpy',
    source: {
      sheet: 'Sheet1',
      valueCell: 'Sheet1!AD2',
      categoryCell: 'Sheet1!AE2',
      rawValue: '2.37',
      rawCategory: 'MODERADA',
    },
    traceToken,
    traceEndpoint: couponTrace(observationId, traceToken),
    warnings: ['EXPOSURE_PERIOD_MISSING'],
  };
}

function facet(
  facetId: string,
  tank: string,
  points: CorrosionCouponPoint[],
  invalidN: number,
): CorrosionCouponFacet {
  return {
    facetId,
    resultSetId: 'result-corrosion',
    tank,
    label: `${tank} · cupón AD/AE`,
    availabilityLabel: points.length
      ? `${points.length} observaciones · ${points.length + invalidN} filas CIC candidatas`
      : `Sin observación numérica de cupón · ${invalidN} filas CIC candidatas`,
    population: {
      candidateCicRows: points.length + invalidN,
      eligibleN: points.length,
      validN: points.length,
      reportedZeroN: 0,
      invalidN,
      missingN: 0,
      display: `${points.length} observaciones / ${points.length + invalidN} filas CIC candidatas`,
    },
    series: {
      id: `series-${tank.toLowerCase()}`,
      label: `${tank} · corrosión general por cupón`,
      unit: 'mpy',
      color: '#1c4463',
      allowedModes: ['points'],
      defaultMode: 'points',
      method: 'coupon',
    },
    points,
  };
}

function response(): CorrosionCouponResponse {
  const point = validPoint();
  const observed = facet('facet-tq55000', 'TQ55000', [point], 1);
  const empty = facet('facet-tk7313', 'TK7313', [], 1);
  return {
    chartId: 'H10-COR-COUPON.V1',
    chartVersion: 'V1',
    metricId: 'THPS.CORROSION.COUPON.MPY.V1',
    metricVersion: 'V1',
    datasetReleaseId: 'release-1',
    importBatchId: 'batch-1',
    calculationRunId: 'run-1',
    resultSetId: 'result-corrosion',
    generatedAt: '2026-08-20T12:00:00Z',
    cutoffDate: '2026-05-23',
    periodStart: '2021-03-10',
    periodEnd: '2026-05-19',
    partialPeriod: true,
    approvalStatus: 'provisional_descriptive',
    approvalLabel: 'Corrosión por cupón · descriptivo provisional',
    unit: 'mpy',
    unitEvidence: 'METRIC_CONTRACT_NOT_SOURCE_HEADER',
    chemicalBasis: null,
    n: 1,
    eligibleN: 1,
    numerator: null,
    denominator: null,
    coverage: null,
    coverageDisplay: null,
    warnings: [
      'EXPOSURE_PERIOD_MISSING',
      'NO_MIC_INFERENCE',
      'NO_CROSS_METHOD_TANK_RANKING',
      'NACE_CATEGORY_REPORTED_NOT_RECALCULATED',
      '2026_PARTIAL',
    ],
    filtersApplied: { method: 'coupon', year: '2026' },
    exportPopulationToken: 'population-corrosion',
    grain: 'CorrosionObservation',
    expectedGrain: 'CouponExposureEvent',
    grainWarning: 'EXPOSURE_PERIOD_MISSING',
    exposureStatus: 'missing',
    population: {
      candidateCicRows: 3,
      eligibleN: 1,
      validN: 1,
      reportedZeroN: 0,
      invalidN: 2,
      missingN: 0,
      display: '1 observaciones / 3 filas CIC candidatas',
    },
    xAxis: {
      field: 'plotX',
      title: 'Fecha de observación',
      unit: null,
      scale: 'linear',
      min: dayNumber('2026-05-19'),
      max: dayNumber('2026-05-20'),
      transformNote: 'Coordenadas calculadas por la API.',
    },
    yAxis: {
      field: 'plotValue',
      title: 'Velocidad de corrosión general por cupón',
      unit: 'mpy',
      scale: 'linear',
      min: 0,
      max: 3,
      transformNote: 'Valor AD sin transformación.',
    },
    xTicks: [
      { value: dayNumber('2026-05-19'), label: '2026-05-19' },
      { value: dayNumber('2026-05-20'), label: '2026-05-20' },
    ],
    yTicks: [
      { value: 0, label: '0' },
      { value: 1.5, label: '1.5' },
      { value: 3, label: '3' },
    ],
    thresholds: [],
    categories: [
      {
        id: 'moderada',
        reportedLabel: 'MODERADA',
        displayLabel: 'MODERADA · categoría reportada',
        color: '#d97706',
        pointStyle: 'triangle',
        symbol: '▲',
        count: 1,
        displayCount: '1 observaciones',
      },
    ],
    facets: [observed, empty],
    tableEquivalent: true,
  };
}

describe('CorrosionCoupon', () => {
  let fixture: ComponentFixture<CorrosionCoupon>;
  let responses: Subject<CorrosionCouponResponse>[];
  let releaseId: ReturnType<typeof signal<string | null>>;
  let filters: ReturnType<
    typeof signal<{ tank: string | null; years: number[]; months: number[] }>
  >;
  let invalidateForQueryFailure: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    responses = [];
    releaseId = signal<string | null>('release-1');
    filters = signal({ tank: null, years: [2026], months: [] });
    invalidateForQueryFailure = vi.fn(() => releaseId.set(null));

    const service = {
      getChart: vi.fn(() => {
        const subject = new Subject<CorrosionCouponResponse>();
        responses.push(subject);
        return subject.asObservable();
      }),
    };
    const releaseStore = {
      analysisReleaseId: computed(() => releaseId()),
      hasQueryableRelease: computed(() => releaseId() !== null),
      invalidateForQueryFailure,
      gateMessage: computed(() => 'Resultados bloqueados.'),
    };

    TestBed.overrideComponent(CorrosionCoupon, {
      remove: { imports: [ChartModule] },
      add: { imports: [ChartStub] },
    });
    await TestBed.configureTestingModule({
      imports: [CorrosionCoupon],
      providers: [
        provideHttpClient(),
        { provide: CorrosionCouponService, useValue: service },
        { provide: DatasetReleaseStore, useValue: releaseStore },
        { provide: FiltersStateService, useValue: { filters } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CorrosionCoupon);
    fixture.detectChanges();
  });

  it('renders the AD/AE scatter, redundant category, partial marker and equivalent table', () => {
    responses[0].next(response());
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('PROVISIONAL DESCRIPTIVO · NO OPERACIONAL');
    expect(text).toContain('Contrato métrico; no consta en el encabezado AD');
    expect(text).toContain('MODERADA · categoría reportada');
    expect(text).toContain('2.37');
    expect(text).toContain('Sheet1!AD2');
    expect(text).toContain('Sheet1!AE2');
    expect(text).toContain('2026 parcial');
    expect(fixture.nativeElement.querySelectorAll('p-chart')).toHaveLength(1);
    expect(fixture.nativeElement.querySelectorAll('table').length).toBeGreaterThanOrEqual(2);
    const traceLink = fixture.nativeElement.querySelector(
      'button.analytical-trace-link',
    ) as HTMLButtonElement;
    expect(traceLink.getAttribute('aria-label')).toContain('abre el visor');
  });

  it('shows TK7313 as no observation and never manufactures a zero point', () => {
    responses[0].next(response());
    fixture.detectChanges();

    const empty = fixture.nativeElement.querySelector('#facet-tk7313-title')?.closest('article');
    expect(empty?.textContent).toContain('Sin observación de cupón AD/AE');
    expect(empty?.textContent).toContain('no se dibuja un valor cero');
    expect(empty?.querySelector('p-chart')).toBeNull();
  });

  it('fails closed on an inconsistent y axis and does not keep the chart visible', () => {
    const invalid = response();
    invalid.yAxis.min = 0.1;
    responses[0].next(invalid);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('no superó la validación contractual');
    expect(fixture.nativeElement.textContent).toContain('COUPON_Y_AXIS_INVALID');
    expect(fixture.nativeElement.querySelector('p-chart')).toBeNull();
  });

  it('invalidates the selected release when the API returns another release identity', () => {
    const mismatch = response();
    mismatch.datasetReleaseId = 'release-other';
    responses[0].next(mismatch);
    fixture.detectChanges();

    expect(invalidateForQueryFailure).toHaveBeenCalledOnce();
    expect(fixture.nativeElement.querySelector('p-chart')).toBeNull();
  });

  it('invalidates shared context when H10 applies a different tank or period', () => {
    const mismatch = response();
    mismatch.filtersApplied = { method: 'coupon', tank: 'TK7311', year: '2025' };
    responses[0].next(mismatch);
    fixture.detectChanges();

    expect(invalidateForQueryFailure).toHaveBeenCalledOnce();
    expect(fixture.nativeElement.textContent).toContain('DASHBOARD_FILTER_TANK_MISMATCH');
    expect(fixture.nativeElement.querySelector('p-chart')).toBeNull();
  });

  it('removes a previous result before a filtered request and after a stale response', () => {
    responses[0].next(response());
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('p-chart')).not.toBeNull();

    filters.set({ tank: 'TK7311', years: [2025], months: [] });
    fixture.detectChanges();
    expect(responses).toHaveLength(2);
    expect(fixture.nativeElement.querySelector('p-chart')).toBeNull();

    responses[1].error(
      new HttpErrorResponse({
        status: 410,
        error: { code: 'STALE_RESULT', detail: 'Resultado vencido.' },
      }),
    );
    fixture.detectChanges();
    expect(invalidateForQueryFailure).toHaveBeenCalledOnce();
    expect(fixture.nativeElement.textContent).toContain('Resultado vencido.');
  });
});

describe('corrosion coupon HTTP failures', () => {
  it('preserves a declared blocked status and reasons', () => {
    const failure = classifyCorrosionCouponFailure(
      new HttpErrorResponse({
        status: 422,
        error: {
          approvalStatus: 'blocked_event_grain',
          detail: 'Falta exposición.',
          warnings: ['EXPOSURE_PERIOD_MISSING'],
        },
      }),
    );

    expect(failure).toEqual({
      status: 'blocked_event_grain',
      message: 'Falta exposición.',
      reasons: ['EXPOSURE_PERIOD_MISSING'],
    });
  });

  it('invalidates only failures that remove confidence in the exact release identity', () => {
    expect(
      shouldInvalidateReleaseForCorrosionCouponFailure(
        new HttpErrorResponse({ status: 410, error: { code: 'STALE_RESULT' } }),
      ),
    ).toBe(true);
    expect(
      shouldInvalidateReleaseForCorrosionCouponFailure(
        new HttpErrorResponse({ status: 422, error: { code: 'FILTER_NOT_SUPPORTED' } }),
      ),
    ).toBe(false);
  });
});
