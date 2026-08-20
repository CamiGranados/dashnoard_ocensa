import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Corrosion } from './corrosion';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';

describe('Corrosion', () => {
  let component: Corrosion;
  let fixture: ComponentFixture<Corrosion>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Corrosion],
      providers: [provideHttpClient(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(Corrosion);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Resultados bloqueados');
  });
});
