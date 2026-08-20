import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardShell } from './dashboard-shell';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';

describe('DashboardShell', () => {
  let component: DashboardShell;
  let fixture: ComponentFixture<DashboardShell>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardShell],
      providers: [provideHttpClient(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardShell);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Bloqueado');
    expect(fixture.nativeElement.textContent).not.toContain('Normal');
    expect(fixture.nativeElement.textContent).not.toContain('TK-001');
    expect(fixture.nativeElement.textContent).toContain('Aprobado el');
    expect(fixture.nativeElement.textContent).toContain(
      'Dashboard descriptivo para preparación del desescalamiento THPS OCENSA',
    );
    expect(fixture.nativeElement.textContent).not.toContain('optimizar el tratamiento');
  });
});
