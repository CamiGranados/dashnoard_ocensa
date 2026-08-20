import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Overview } from './overview';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';

describe('Overview', () => {
  let component: Overview;
  let fixture: ComponentFixture<Overview>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Overview],
      providers: [provideHttpClient(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(Overview);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Resultados bloqueados');
    expect(fixture.nativeElement.textContent).not.toContain('2,850');
  });
});
