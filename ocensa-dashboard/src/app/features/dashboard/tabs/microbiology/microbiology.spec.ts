import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Microbiology } from './microbiology';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';

describe('Microbiology', () => {
  let component: Microbiology;
  let fixture: ComponentFixture<Microbiology>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Microbiology],
      providers: [provideHttpClient(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(Microbiology);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Resultados bloqueados');
  });
});
