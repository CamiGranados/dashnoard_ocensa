import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Tanks } from './tanks';
import { provideRouter } from '@angular/router';

describe('Tanks', () => {
  let component: Tanks;
  let fixture: ComponentFixture<Tanks>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Tanks],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(Tanks);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
