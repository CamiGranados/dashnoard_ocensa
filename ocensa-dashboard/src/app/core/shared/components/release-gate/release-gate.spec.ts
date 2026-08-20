import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ReleaseGate } from './release-gate';

describe('ReleaseGate', () => {
  let fixture: ComponentFixture<ReleaseGate>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReleaseGate],
      providers: [provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(ReleaseGate);
    fixture.detectChanges();
  });

  it('renders a visible blocked state before a release exists', () => {
    expect(fixture.nativeElement.textContent).toContain('Resultados bloqueados');
    expect(fixture.nativeElement.textContent).not.toContain('Normal');
  });
});
