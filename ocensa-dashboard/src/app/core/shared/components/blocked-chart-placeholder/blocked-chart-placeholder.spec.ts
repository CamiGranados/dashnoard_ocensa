import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BlockedChartPlaceholder } from './blocked-chart-placeholder';

describe('BlockedChartPlaceholder', () => {
  let fixture: ComponentFixture<BlockedChartPlaceholder>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [BlockedChartPlaceholder] }).compileComponents();
    fixture = TestBed.createComponent(BlockedChartPlaceholder);
  });

  it('shows the evidence needed without rendering an analytical canvas', () => {
    fixture.componentRef.setInput('status', 'blocked_unit');
    fixture.componentRef.setInput('title', 'Cobertura bloqueada');
    fixture.componentRef.setInput('reasons', ['La unidad no fue confirmada.']);
    fixture.componentRef.setInput('owner', 'Dueño del dato');
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Unidad no confirmada');
    expect(text).toContain('La unidad no fue confirmada.');
    expect(text).toContain('Dueño del dato');
    expect(fixture.nativeElement.querySelector('canvas')).toBeNull();
  });

  it('never lets an approved state turn a blocked placeholder into a published chart', () => {
    fixture.componentRef.setInput('status', 'approved_current');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Resultado no verificable');
  });
});
