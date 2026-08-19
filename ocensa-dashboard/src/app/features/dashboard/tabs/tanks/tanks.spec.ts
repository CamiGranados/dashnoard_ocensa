import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Tanks } from './tanks';

describe('Tanks', () => {
  let component: Tanks;
  let fixture: ComponentFixture<Tanks>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Tanks],
    }).compileComponents();

    fixture = TestBed.createComponent(Tanks);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
