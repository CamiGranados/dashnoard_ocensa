import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ScientificStateBanner, scientificStateView } from './scientific-state-banner';

describe('ScientificStateBanner', () => {
  let fixture: ComponentFixture<ScientificStateBanner>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ScientificStateBanner] }).compileComponents();
    fixture = TestBed.createComponent(ScientificStateBanner);
  });

  it('renders the approved state as non-blocking', () => {
    fixture.componentRef.setInput('status', 'approved_current');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Aprobado vigente');
    expect(fixture.nativeElement.querySelector('[data-blocking="false"]')).not.toBeNull();
  });

  it('fails closed for an unknown wire state', () => {
    fixture.componentRef.setInput('status', 'unexpected_wire_state');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Resultado no verificable');
    expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull();
    expect(scientificStateView('unexpected_wire_state').blocking).toBe(true);
  });

  it('labels a descriptive provisional result without calling it approved', () => {
    fixture.componentRef.setInput('status', 'provisional_descriptive');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Perfil descriptivo provisional');
    expect(fixture.nativeElement.textContent).not.toContain('Aprobado');
    expect(fixture.nativeElement.querySelector('[data-blocking="false"]')).not.toBeNull();
  });
});
