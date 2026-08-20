import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ThpsTolerance } from './thps-tolerance';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';

describe('ThpsTolerance', () => {
  let component: ThpsTolerance;
  let fixture: ComponentFixture<ThpsTolerance>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ThpsTolerance],
      providers: [provideHttpClient(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(ThpsTolerance);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Resultados bloqueados');
    expect(fixture.nativeElement.textContent).not.toContain('límite de detección estándar');
  });
});
