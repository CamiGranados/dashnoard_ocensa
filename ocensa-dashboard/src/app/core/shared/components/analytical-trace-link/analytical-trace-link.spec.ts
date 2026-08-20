import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  AnalyticalTraceCell,
  AnalyticalTraceResponse,
} from '../../../models/analytical-trace.model';
import { AnalyticalTraceLink } from './analytical-trace-link';

const endpointA =
  '/api/v1/analytics/traces/V1?datasetReleaseId=release-1&metricId=THPS.DATA.COVERAGE.V1&metricVersion=V1&chartId=H11&chartVersion=V1&resultSetId=result-1&pointId=point-1&traceToken=token-1&tank=TK7311&years=2026&page=1&pageSize=50';
const endpointB = endpointA
  .replace('pointId=point-1', 'pointId=point-2')
  .replace('traceToken=token-1', 'traceToken=token-2');
const importBatchId = 'b'.repeat(64);
const headerSha256 = 'c'.repeat(64);
const lineageSha256 = 'd'.repeat(64);

function cell(row: number): AnalyticalTraceCell {
  return {
    sourceCellId: `Sheet1!A${row}`,
    sheet: 'Sheet1',
    address: `A${row}`,
    sourceRowNumber: row,
    sourceColumnNumber: 1,
    headerText: 'Tanque',
    headerSha256,
    status: 'text',
    qualifier: null,
    unit: null,
    parseRuleId: 'raw-classifier-v2:text',
    cellDataType: 'Text',
    warning: null,
    lineageSha256,
  };
}

function responseFor(endpoint: string, page = 1, totalCells = 1): AnalyticalTraceResponse {
  const query = new URL(endpoint, 'https://trace.ocensa.invalid').searchParams;
  const totalPages = totalCells === 0 ? 0 : Math.ceil(totalCells / 50);
  const firstRow = (page - 1) * 50 + 1;
  const pageCount = totalCells === 0 ? 0 : Math.min(50, totalCells - firstRow + 1);

  return {
    contractVersion: 'TRACE.V1',
    datasetReleaseId: query.get('datasetReleaseId')!,
    importBatchId,
    metricId: query.get('metricId')!,
    metricVersion: query.get('metricVersion')!,
    chartId: query.get('chartId')!,
    chartVersion: query.get('chartVersion')!,
    resultSetId: query.get('resultSetId')!,
    pointId: query.get('pointId')!,
    traceToken: query.get('traceToken')!,
    page,
    pageSize: 50,
    totalCells,
    totalPages,
    hasPreviousPage: page > 1 && totalCells > 0,
    hasNextPage: totalPages > 0 && page < totalPages,
    cells: Array.from({ length: pageCount }, (_, index) => cell(firstRow + index)),
    warnings: ['raw_values_not_exposed', 'exact_release_recalculated_no_latest'],
  };
}

describe('AnalyticalTraceLink', () => {
  let fixture: ComponentFixture<AnalyticalTraceLink>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnalyticalTraceLink],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  function render(endpoint = endpointA): void {
    fixture = TestBed.createComponent(AnalyticalTraceLink);
    fixture.componentRef.setInput('endpoint', endpoint);
    fixture.componentRef.setInput('contextLabel', 'TK7311 · BSR');
    fixture.detectChanges();
  }

  function openViewer(): void {
    const trigger = fixture.nativeElement.querySelector(
      'button.analytical-trace-link',
    ) as HTMLButtonElement;
    trigger.click();
    fixture.detectChanges();
  }

  it.each([
    'javascript:alert(1)',
    'https://evil.example/trace',
    '//evil.example/trace',
    '/api/v1/analytics/traces/V1?pointId=point-1',
  ])('does not render a trigger for an unsafe endpoint: %s', (endpoint) => {
    render(endpoint);

    expect(fixture.nativeElement.querySelector('.analytical-trace-link')).toBeNull();
  });

  it('loads and renders only validated TRACE.V1 metadata in an accessible viewer', () => {
    render();
    openViewer();

    const dialog = fixture.nativeElement.querySelector('[role="dialog"]') as HTMLElement;
    expect(dialog).not.toBeNull();
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(fixture.nativeElement.textContent).toContain('Consultando página 1');

    http.expectOne(endpointA).flush(responseFor(endpointA));
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    const json = fixture.nativeElement.querySelector(
      '.trace-viewer__actions a',
    ) as HTMLAnchorElement;
    expect(text).toContain('result-1');
    expect(text).toContain('point-1');
    expect(text).toContain('Sheet1!A1');
    expect(text).toContain('raw-classifier-v2:text');
    expect(text).not.toContain('token-1');
    expect(json.getAttribute('href')).toBe(endpointA);
    expect(json.getAttribute('target')).toBe('_blank');
    expect(json.getAttribute('rel')).toContain('noopener');
  });

  it('keeps reverse keyboard navigation inside the modal from its initial focus target', () => {
    render();
    openViewer();

    const dialog = fixture.nativeElement.querySelector('[role="dialog"]') as HTMLElement;
    const close = fixture.nativeElement.querySelector('.trace-viewer__close') as HTMLButtonElement;
    dialog.focus();
    dialog.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Tab',
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      }),
    );

    expect(document.activeElement).toBe(close);
    http.expectOne(endpointA).flush(responseFor(endpointA));
  });

  it('navigates previous and next pages derived only from the immutable base endpoint', () => {
    render();
    openViewer();
    http.expectOne(endpointA).flush(responseFor(endpointA, 1, 51));
    fixture.detectChanges();

    let buttons = [
      ...fixture.nativeElement.querySelectorAll('.trace-viewer__actions button'),
    ] as HTMLButtonElement[];
    let previous = buttons.find((button) => button.textContent?.includes('Anterior'))!;
    let next = buttons.find((button) => button.textContent?.includes('Siguiente'))!;
    expect(previous.disabled).toBe(true);
    expect(next.disabled).toBe(false);

    next.click();
    fixture.detectChanges();
    const page2Endpoint = endpointA.replace('&page=1', '&page=2');
    expect(fixture.nativeElement.textContent).toContain('Consultando página 2');
    expect(fixture.nativeElement.querySelector('table')).toBeNull();
    http.expectOne(page2Endpoint).flush(responseFor(endpointA, 2, 51));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Página 2 de 2');
    expect(fixture.nativeElement.textContent).toContain('Sheet1!A51');
    expect(
      (
        fixture.nativeElement.querySelector('.trace-viewer__actions a') as HTMLAnchorElement
      ).getAttribute('href'),
    ).toBe(page2Endpoint);
    buttons = [
      ...fixture.nativeElement.querySelectorAll('.trace-viewer__actions button'),
    ] as HTMLButtonElement[];
    previous = buttons.find((button) => button.textContent?.includes('Anterior'))!;
    next = buttons.find((button) => button.textContent?.includes('Siguiente'))!;
    expect(previous.disabled).toBe(false);
    expect(next.disabled).toBe(true);

    previous.click();
    fixture.detectChanges();
    http.expectOne(endpointA).flush(responseFor(endpointA, 1, 51));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Página 1 de 2');
  });

  it('fails closed on a cross-identity response', () => {
    render();
    openViewer();
    const crossIdentity = responseFor(endpointA);
    crossIdentity.resultSetId = 'result-other';

    http.expectOne(endpointA).flush(crossIdentity);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('TRACE_RESPONSE_IDENTITY_MISMATCH');
    expect(fixture.nativeElement.querySelector('table')).toBeNull();
    expect(fixture.nativeElement.querySelector('.trace-viewer__actions a')).toBeNull();
  });

  it('rejects forbidden response fields recursively without exposing their contents', () => {
    render();
    openViewer();
    const forbidden = responseFor(endpointA) as unknown as Record<string, unknown>;
    (forbidden['cells'] as Array<Record<string, unknown>>)[0]['rawValue'] = 'classified-secret';

    http.expectOne(endpointA).flush(forbidden);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('TRACE_FORBIDDEN_FIELD_PRESENT');
    expect(fixture.nativeElement.textContent).not.toContain('classified-secret');
    expect(fixture.nativeElement.querySelector('table')).toBeNull();
  });

  it('shows a generic HTTP error and retries without rendering the response body', () => {
    render();
    openViewer();
    http
      .expectOne(endpointA)
      .flush({ detail: 'classified-backend-message' }, { status: 503, statusText: 'Unavailable' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('HTTP 503');
    expect(fixture.nativeElement.textContent).not.toContain('classified-backend-message');
    const retry = [...fixture.nativeElement.querySelectorAll('button')].find((button) =>
      button.textContent?.includes('Reintentar'),
    ) as HTMLButtonElement;
    retry.click();
    fixture.detectChanges();
    http.expectOne(endpointA).flush(responseFor(endpointA));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Sheet1!A1');
  });

  it('cancels an in-flight page when its endpoint input changes and never mixes A with B', () => {
    render();
    openViewer();
    const pendingA = http.expectOne(endpointA);

    fixture.componentRef.setInput('endpoint', endpointB);
    fixture.detectChanges();

    expect(pendingA.cancelled).toBe(true);
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('point-1');

    openViewer();
    http.expectOne(endpointB).flush(responseFor(endpointB));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('point-2');
    expect(fixture.nativeElement.textContent).not.toContain('point-1');
    expect(
      (
        fixture.nativeElement.querySelector('.trace-viewer__actions a') as HTMLAnchorElement
      ).getAttribute('href'),
    ).toBe(endpointB);
  });

  it('clears a validated response when its endpoint input changes', () => {
    render();
    openViewer();
    http.expectOne(endpointA).flush(responseFor(endpointA));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('point-1');

    fixture.componentRef.setInput('endpoint', endpointB);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('point-1');
    expect(fixture.nativeElement.querySelector('.trace-viewer__actions a')).toBeNull();
  });
});
