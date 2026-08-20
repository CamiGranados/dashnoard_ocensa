import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Sidebar } from './sidebar';
import { provideRouter } from '@angular/router';

describe('Sidebar', () => {
  let component: Sidebar;
  let fixture: ComponentFixture<Sidebar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Sidebar],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(Sidebar);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('exposes the descriptive coverage view without calling it a quality score', () => {
    const information = component.items.find((item) => item.label === 'Información');
    const coverage = information?.items?.find((item) => item.routerLink === '/coverage');

    expect(coverage?.label).toBe('Cobertura del archivo');
    expect(coverage?.label).not.toContain('Calidad');
  });

  it('exposes H08 as the only reachable microbiology view', () => {
    const laboratory = component.items.find((item) => item.label === 'Calidad');
    const distribution = laboratory?.items?.find(
      (item) => item.routerLink === '/microbiology/distribution',
    );

    expect(distribution?.label).toBe('Microbiología · distribución');
    expect(laboratory?.items?.some((item) => item.routerLink === '/microbiology')).toBe(false);
  });

  it('exposes the provisional coupon corrosion view as its own route', () => {
    const laboratory = component.items.find((item) => item.label === 'Calidad');
    const coupon = laboratory?.items?.find(
      (item) => item.routerLink === '/corrosion/coupon',
    );

    expect(coupon?.label).toBe('Corrosión por cupón');
  });

  it('keeps domains without approved semantics disabled and unlinked', () => {
    const allItems = component.items.flatMap((item) => item.items ?? []);
    const pending = allItems.filter((item) => item.label?.includes('pendiente'));

    expect(pending.map((item) => item.label)).toEqual(
      expect.arrayContaining([
        'Tanques · pendiente',
        'Operación e Inyección · pendiente',
        'Escenarios · pendiente',
        'Fisicoquímica · pendiente',
        'Tratamiento y Residual · pendiente',
      ]),
    );
    expect(pending.every((item) => item.disabled === true && !item.routerLink)).toBe(true);
  });
});
