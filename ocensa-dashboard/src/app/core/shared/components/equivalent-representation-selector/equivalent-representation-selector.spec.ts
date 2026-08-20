import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ScientificSeriesSpec } from '../../../models/scientific-chart.model';
import { EquivalentRepresentationSelector } from './equivalent-representation-selector';

const series: ScientificSeriesSpec = {
  id: 'micro-bsr',
  label: 'BSR',
  unit: 'Bac/mL',
  color: '#176b87',
  allowedModes: ['points', 'bars'],
  defaultMode: 'points',
};

describe('EquivalentRepresentationSelector', () => {
  let fixture: ComponentFixture<EquivalentRepresentationSelector>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EquivalentRepresentationSelector],
    }).compileComponents();
    fixture = TestBed.createComponent(EquivalentRepresentationSelector);
    fixture.componentRef.setInput('series', series);
    fixture.detectChanges();
  });

  it('renders only modes approved by the server series contract', () => {
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Puntos');
    expect(text).toContain('Barras por evento');
    expect(text).not.toContain('Línea intrasserie');
  });

  it('emits an allowed mode and ignores a disallowed one', () => {
    const emitted: string[] = [];
    fixture.componentInstance.modeChange.subscribe((mode) => emitted.push(mode));

    fixture.componentInstance.select('bars');
    fixture.componentInstance.select('line');

    expect(emitted).toEqual(['bars']);
  });
});
