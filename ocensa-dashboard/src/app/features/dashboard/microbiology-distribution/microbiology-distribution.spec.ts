import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { Component, computed, input, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ChartModule } from 'primeng/chart';
import { Subject } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import {
  H08_BOX_TRACE_POINT_SUFFIX,
  H08DistributionResponse,
} from '../../../core/models/h08-distribution.model';
import { DatasetReleaseStore } from '../../../core/services/dataset-release-store.service';
import { FiltersStateService } from '../../../core/services/filters-state.service';
import { H08DistributionService } from '../../../core/services/h08-distribution.service';
import {
  MicrobiologyDistribution,
  classifyH08Failure,
  shouldInvalidateReleaseForH08Failure,
} from './microbiology-distribution';
import { analyticalTraceFixture } from '../../../../testing/analytical-trace-fixture';

@Component({ selector: 'p-chart', template: '' })
class ChartStub {
  readonly type = input<string>();
  readonly data = input<unknown>();
  readonly options = input<unknown>();
}

function h08Trace(
  pointId: string,
  traceToken: string,
  filters: Readonly<Record<string, string | readonly string[]>> = {
    tank: 'TK7311',
    year: '2026',
  },
): string {
  return analyticalTraceFixture({
    metricId: 'THPS.MICRO.GROUP.CONTROL.V1',
    chartId: 'H08',
    chartVersion: 'H08.V1',
    resultSetId: 'result-h08',
    pointId,
    traceToken,
    filters,
  });
}

function refreshH08TraceEndpoints(
  candidate: H08DistributionResponse,
  filters: Readonly<Record<string, string | readonly string[]>>,
): void {
  for (const facet of candidate.facets) {
    facet.traceEndpoint = h08Trace(facet.facetId, facet.traceSetId, filters);
    if (facet.boxSummary) {
      facet.boxSummary.traceEndpoint = h08Trace(
        `${facet.facetId}${H08_BOX_TRACE_POINT_SUFFIX}`,
        facet.boxSummary.traceToken,
        filters,
      );
    }
    for (const point of facet.points) {
      point.traceEndpoint = h08Trace(point.pointId, point.traceToken, filters);
    }
  }
}

function response(): H08DistributionResponse {
  const candidate: H08DistributionResponse = {
    chartId: 'H08',
    chartVersion: 'H08.V1',
    metricId: 'THPS.MICRO.GROUP.CONTROL.V1',
    metricVersion: 'V1',
    datasetReleaseId: 'release-1',
    importBatchId: 'batch-1',
    calculationRunId: 'run-1',
    resultSetId: 'result-h08',
    generatedAt: '2026-08-20T12:00:00Z',
    cutoffDate: '2026-05-23',
    periodStart: '2026-01-01',
    periodEnd: '2026-05-23',
    partialPeriod: false,
    approvalStatus: 'provisional_descriptive',
    approvalLabel: 'Perfil descriptivo provisional',
    unit: 'Bac/mL',
    chemicalBasis: null,
    n: 1,
    eligibleN: 2,
    numerator: 1,
    denominator: 2,
    coverage: 0.5,
    coverageDisplay: '50 % (1/2)',
    warnings: ['lod_loq_not_approved'],
    filtersApplied: { tank: 'TK7311', year: '2026' },
    exportPopulationToken: 'population-h08',
    xAxis: {
      field: 'plotX',
      title: 'Dispersión',
      unit: null,
      scale: 'linear',
      min: 0,
      max: 1,
      transformNote: 'API',
    },
    yAxis: {
      field: 'plotValue',
      title: 'Recuento microbiológico',
      unit: 'Bac/mL',
      scale: 'logarithmic',
      min: 1,
      max: 1_000_000,
      transformNote: 'Solo positivos exactos.',
    },
    yTicks: [
      { value: 1, label: '1' },
      { value: 100, label: '100' },
      { value: 1_000_000, label: '1000000' },
    ],
    thresholds: [
      {
        id: 'micro-strictly-greater-than-100',
        value: 100,
        label: 'Umbral descriptivo > 100 Bac/mL',
        unit: 'Bac/mL',
        comparison: '>',
        approvalStatus: 'provisional_descriptive',
      },
    ],
    facets: [
      {
        facetId: 'facet-bsr',
        resultSetId: 'result-h08',
        traceSetId: 'trace-set-bsr',
        traceEndpoint: h08Trace('facet-bsr', 'trace-set-bsr'),
        group: 'BSR',
        label: 'TK7311 · BSR · positivos exactos y estados',
        tankLabel: 'TK7311',
        series: {
          id: 'series-bsr',
          label: 'BSR · positivos exactos',
          unit: 'Bac/mL',
          color: '#1c4463',
          allowedModes: ['points', 'box'],
          defaultMode: 'points',
          method: 'positive_exact_raw_values',
          microbialGroup: 'BSR',
        },
        distributionN: 1,
        eligibleN: 2,
        coverage: 0.5,
        coverageDisplay: '50 % (1/2)',
        statusLanes: [
          {
            status: 'reported_zero',
            label: 'Cero reportado',
            symbol: '○',
            count: 0,
            displayCount: '0',
            color: '#0f766e',
          },
          {
            status: 'not_detected',
            label: 'No detectado',
            symbol: '◇',
            count: 1,
            displayCount: '1',
            color: '#315b7d',
          },
          {
            status: 'censored_low',
            label: 'Censura inferior',
            symbol: '▽',
            count: 0,
            displayCount: '0',
            color: '#d97706',
          },
          {
            status: 'censored_high',
            label: 'Censura superior',
            symbol: '△',
            count: 0,
            displayCount: '0',
            color: '#d97706',
          },
          {
            status: 'missing',
            label: 'Faltante',
            symbol: '□',
            count: 0,
            displayCount: '0',
            color: '#64748b',
          },
          {
            status: 'invalid',
            label: 'Inválido',
            symbol: '×',
            count: 0,
            displayCount: '0',
            color: '#b42318',
          },
        ],
        boxSummary: {
          resultSetId: 'result-h08',
          facetId: 'facet-bsr',
          distributionN: 1,
          min: 1_000,
          q1: 1_000,
          median: 1_000,
          q3: 1_000,
          max: 1_000,
          minDisplay: '1000',
          q1Display: '1000',
          medianDisplay: '1000',
          q3Display: '1000',
          maxDisplay: '1000',
          traceToken: 'trace-box',
          traceEndpoint: h08Trace(`facet-bsr${H08_BOX_TRACE_POINT_SUFFIX}`, 'trace-box'),
        },
        points: [
          {
            pointId: 'positive',
            resultSetId: 'result-h08',
            facetId: 'facet-bsr',
            seriesId: 'series-bsr',
            plotX: 0.45,
            sampleDate: '2026-05-20',
            tank: 'TK7311',
            drain: null,
            source: 'CIC',
            rawValue: '1000',
            numericValue: 1_000,
            plotValue: 1_000,
            lowerBound: null,
            upperBound: null,
            qualifier: null,
            unit: 'Bac/mL',
            status: 'valid',
            statusLabel: 'Positivo exacto',
            plotKind: 'exact',
            sourceCellIds: ['Sheet1!A6', 'Sheet1!D6', 'Sheet1!Q6', 'Sheet1!AS6'],
            traceToken: 'trace-positive',
            traceEndpoint: h08Trace('positive', 'trace-positive'),
            warnings: [],
          },
          {
            pointId: 'nd',
            resultSetId: 'result-h08',
            facetId: 'facet-bsr',
            seriesId: 'series-bsr',
            plotX: 0.55,
            sampleDate: '2026-05-21',
            tank: 'TK7311',
            drain: null,
            source: 'CIC',
            rawValue: 'N.D.',
            numericValue: null,
            plotValue: null,
            lowerBound: null,
            upperBound: null,
            qualifier: 'N.D.',
            unit: 'Bac/mL',
            status: 'not_detected',
            statusLabel: 'No detectado',
            plotKind: 'status_lane',
            sourceCellIds: ['Sheet1!A7', 'Sheet1!D7', 'Sheet1!Q7', 'Sheet1!AS7'],
            traceToken: 'trace-nd',
            traceEndpoint: h08Trace('nd', 'trace-nd'),
            warnings: ['lod_loq_not_approved'],
          },
        ],
      },
    ],
  };

  const template = candidate.facets[0];
  const groups = [
    { group: 'BSR', column: 'Q', color: '#1c4463' },
    { group: 'BPA', column: 'R', color: '#0f766e' },
    { group: 'BHT', column: 'S', color: '#7c3aed' },
    { group: 'BAnT', column: 'T', color: '#c2410c' },
  ] as const;
  candidate.facets = groups.map(({ group, column, color }) => {
    const facetId = `facet-${group.toLowerCase()}`;
    const seriesId = `series-${group.toLowerCase()}`;
    return {
      ...template,
      facetId,
      group,
      label: `TK7311 · ${group} · positivos exactos y estados`,
      traceSetId: `trace-set-${group.toLowerCase()}`,
      traceEndpoint: h08Trace(facetId, `trace-set-${group.toLowerCase()}`),
      series: {
        ...template.series,
        id: seriesId,
        label: `${group} · positivos exactos`,
        color,
        microbialGroup: group,
      },
      statusLanes: template.statusLanes.map((lane) => ({ ...lane })),
      boxSummary: template.boxSummary
        ? {
            ...template.boxSummary,
            facetId,
            traceToken: `trace-box-${group.toLowerCase()}`,
            traceEndpoint: h08Trace(
              `${facetId}${H08_BOX_TRACE_POINT_SUFFIX}`,
              `trace-box-${group.toLowerCase()}`,
            ),
          }
        : null,
      points: template.points.map((point) => ({
        ...point,
        pointId: `${point.pointId}-${group.toLowerCase()}`,
        facetId,
        seriesId,
        sourceCellIds: point.sourceCellIds.map((sourceCellId) =>
          sourceCellId.replace(/!Q(\d+)$/, `!${column}$1`),
        ),
        traceToken: `${point.traceToken}-${group.toLowerCase()}`,
        traceEndpoint: h08Trace(
          `${point.pointId}-${group.toLowerCase()}`,
          `${point.traceToken}-${group.toLowerCase()}`,
        ),
      })),
    };
  });
  candidate.n = 4;
  candidate.eligibleN = 8;
  candidate.numerator = 4;
  candidate.denominator = 8;
  candidate.coverage = 0.5;
  candidate.coverageDisplay = '50 % (4/8)';
  refreshH08TraceEndpoints(candidate, { tank: 'TK7311', year: '2026' });
  return candidate;
}

describe('MicrobiologyDistribution', () => {
  let fixture: ComponentFixture<MicrobiologyDistribution>;
  let responses: Subject<H08DistributionResponse>[];
  let releaseId: ReturnType<typeof signal<string | null>>;
  let filters: ReturnType<
    typeof signal<{ tank: string | null; years: number[]; months: number[] }>
  >;
  let invalidateForQueryFailure: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    responses = [];
    releaseId = signal<string | null>('release-1');
    filters = signal({ tank: 'TK7311', years: [2026], months: [] });
    invalidateForQueryFailure = vi.fn(() => releaseId.set(null));

    const service = {
      getDistribution: vi.fn(() => {
        const subject = new Subject<H08DistributionResponse>();
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

    TestBed.overrideComponent(MicrobiologyDistribution, {
      remove: { imports: [ChartModule] },
      add: { imports: [ChartStub] },
    });
    await TestBed.configureTestingModule({
      imports: [MicrobiologyDistribution],
      providers: [
        provideHttpClient(),
        { provide: H08DistributionService, useValue: service },
        { provide: DatasetReleaseStore, useValue: releaseStore },
        { provide: FiltersStateService, useValue: { filters } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MicrobiologyDistribution);
    fixture.detectChanges();
  });

  it('renders provisional facets, exact-point chart, excluded-state lanes and the equivalent raw table', () => {
    responses[0].next(response());
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('PERFIL DESCRIPTIVO · NO OPERACIONAL');
    expect(text).toContain('Umbral descriptivo > 100 Bac/mL');
    expect(text).toContain('No detectado');
    expect(text).toContain('N.D.');
    expect(text).toContain('Sheet1!Q7');
    expect(text).toContain('ResultSet result-h08');
    expect(fixture.nativeElement.querySelector('p-chart')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('table')).not.toBeNull();
    const traceLinks = fixture.nativeElement.querySelectorAll('button.analytical-trace-link');
    expect(traceLinks.length).toBeGreaterThan(0);
    expect(traceLinks[0].getAttribute('aria-label')).toContain('abre el visor');
  });

  it('offers box only because the API supplied a summary and displays that summary after selection', () => {
    responses[0].next(response());
    fixture.detectChanges();

    const firstFacet = fixture.nativeElement.querySelector('.h08-facet') as HTMLElement;
    const buttons = [
      ...firstFacet.querySelectorAll('.mode-selector__button'),
    ] as HTMLButtonElement[];
    const box = buttons.find((button) => button.textContent?.includes('Caja'))!;
    expect(buttons.map((button) => button.textContent?.trim())).toEqual([
      'Puntos',
      'Caja y puntos',
    ]);

    box.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Mediana');
    expect(fixture.nativeElement.textContent).toContain('1000');
  });

  it('paginates the equivalent table without truncating the chart population', () => {
    const many = response();
    const exact = many.facets[0].points[0];
    many.n = 63;
    many.eligibleN = 66;
    many.numerator = 63;
    many.denominator = 66;
    many.coverage = 63 / 66;
    many.coverageDisplay = '95.45 % (63/66)';
    many.facets[0].distributionN = 60;
    many.facets[0].eligibleN = 60;
    many.facets[0].coverage = 1;
    many.facets[0].coverageDisplay = '100 % (60/60)';
    many.facets[0].statusLanes = many.facets[0].statusLanes.map((lane) => ({
      ...lane,
      count: 0,
      displayCount: '0',
    }));
    many.facets[0].boxSummary!.distributionN = 60;
    many.facets[0].points = Array.from({ length: 60 }, (_, index) => ({
      ...exact,
      pointId: `positive-${index + 1}`,
      plotX: (index + 1) / 61,
      sourceCellIds: [
        `Sheet1!A${index + 2}`,
        `Sheet1!D${index + 2}`,
        `Sheet1!Q${index + 2}`,
        `Sheet1!AS${index + 2}`,
      ],
      traceToken: `trace-${index + 1}`,
      traceEndpoint: h08Trace(`positive-${index + 1}`, `trace-${index + 1}`),
    }));

    responses[0].next(many);
    fixture.detectChanges();

    const firstFacet = fixture.nativeElement.querySelector('.h08-facet') as HTMLElement;
    expect(firstFacet.querySelectorAll('tbody tr')).toHaveLength(25);
    const chart = fixture.debugElement.query(By.directive(ChartStub))
      .componentInstance as ChartStub;
    const data = chart.data() as { datasets: Array<{ role?: string; data: unknown[] }> };
    expect(data.datasets.find((dataset) => dataset.role === 'exact-points')?.data).toHaveLength(60);
  });

  it('fails closed when a non-exact point gains an invented log-axis value', () => {
    const invalid = response();
    invalid.facets[0].points[1].plotValue = 1;
    responses[0].next(invalid);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('no superó la validación contractual');
    expect(fixture.nativeElement.querySelector('p-chart')).toBeNull();
    expect(fixture.nativeElement.querySelector('table')).toBeNull();
  });

  it('invalidates only when a response proves a release mismatch', () => {
    const stale = response();
    stale.datasetReleaseId = 'another-release';
    responses[0].next(stale);
    fixture.detectChanges();

    expect(invalidateForQueryFailure).toHaveBeenCalledOnce();
    expect(fixture.nativeElement.querySelector('p-chart')).toBeNull();
  });

  it('invalidates shared context when H08 reports another filter population', () => {
    const stale = response();
    stale.filtersApplied = { tank: 'TK7311', year: '2025' };
    responses[0].next(stale);
    fixture.detectChanges();

    expect(invalidateForQueryFailure).toHaveBeenCalledOnce();
    expect(fixture.nativeElement.textContent).toContain('DASHBOARD_FILTER_YEAR_MISMATCH');
    expect(fixture.nativeElement.querySelector('p-chart')).toBeNull();
  });

  it('preserves release identity for an unavailable or scientifically blocked H08 contract', () => {
    responses[0].error(
      new HttpErrorResponse({ status: 503, error: { message: 'Chart provider pendiente.' } }),
    );
    fixture.detectChanges();

    expect(invalidateForQueryFailure).not.toHaveBeenCalled();
    expect(releaseId()).toBe('release-1');
    expect(fixture.nativeElement.textContent).toContain('Chart provider pendiente.');
  });

  it('ignores a stale asynchronous response after filters trigger a newer request', () => {
    const first = responses[0];
    filters.set({ tank: 'TK7311', years: [2025], months: [] });
    fixture.detectChanges();

    expect(responses).toHaveLength(2);
    first.next(response());
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('p-chart')).toBeNull();

    const current = response();
    current.filtersApplied = { tank: 'TK7311', year: '2025' };
    current.periodStart = '2025-01-01';
    current.periodEnd = '2025-12-31';
    current.facets.forEach((facet) =>
      facet.points.forEach((point) => {
        point.sampleDate = point.sampleDate.replace('2026-', '2025-');
      }),
    );
    refreshH08TraceEndpoints(current, { tank: 'TK7311', year: '2025' });
    responses[1].next(current);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('p-chart')).not.toBeNull();
  });
});

describe('H08 HTTP failures', () => {
  it('keeps 404/422/503 fail-closed without treating a missing ChartSpec as a stale release', () => {
    expect(classifyH08Failure(new HttpErrorResponse({ status: 404 })).status).toBe(
      'pending_validation',
    );
    expect(classifyH08Failure(new HttpErrorResponse({ status: 422 })).status).toBe(
      'pending_validation',
    );
    expect(classifyH08Failure(new HttpErrorResponse({ status: 503 })).status).toBe(
      'calculation_error',
    );
    expect(shouldInvalidateReleaseForH08Failure(new HttpErrorResponse({ status: 503 }))).toBe(
      false,
    );
  });

  it('invalidates only an explicit stale release code', () => {
    expect(
      shouldInvalidateReleaseForH08Failure(
        new HttpErrorResponse({
          status: 404,
          error: { code: 'DATASET_RELEASE_NOT_FOUND' },
        }),
      ),
    ).toBe(true);
    expect(
      shouldInvalidateReleaseForH08Failure(
        new HttpErrorResponse({
          status: 404,
          error: { code: 'CHART_NOT_SUPPORTED' },
        }),
      ),
    ).toBe(false);
  });
});
