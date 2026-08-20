import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ScientificResultIdentity } from '../../../models/scientific-chart.model';
import { ResultIdentityStrip } from './result-identity-strip';

const identity: ScientificResultIdentity = {
  metricId: 'THPS.DATA.COVERAGE.V1',
  metricVersion: '1.0.0',
  datasetReleaseId: 'release-1',
  importBatchId: 'batch-1',
  calculationRunId: 'run-1',
  resultSetId: 'result-1',
  generatedAt: '2026-08-20T12:00:00Z',
  cutoffDate: '2026-05-23',
  periodStart: '2026-01-01',
  periodEnd: '2026-05-23',
  partialPeriod: true,
  approvalStatus: 'approved_current',
  approvalLabel: 'Aprobado vigente',
  unit: '%',
  chemicalBasis: null,
  n: 8,
  eligibleN: 10,
  numerator: 8,
  denominator: 10,
  coverage: 0.8,
  coverageDisplay: '80 %',
  warnings: [],
  filtersApplied: {},
  exportPopulationToken: 'population-1',
};

describe('ResultIdentityStrip', () => {
  let fixture: ComponentFixture<ResultIdentityStrip>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ResultIdentityStrip] }).compileComponents();
    fixture = TestBed.createComponent(ResultIdentityStrip);
    fixture.componentRef.setInput('identity', identity);
    fixture.detectChanges();
  });

  it('shows immutable result identity and server-formatted coverage', () => {
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('THPS.DATA.COVERAGE.V1');
    expect(text).toContain('release-1');
    expect(text).toContain('result-1');
    expect(text).toContain('80 %');
    expect(text).toContain('n 8 · población elegible 10');
  });
});
